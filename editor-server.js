const express = require('express');
const multer = require('multer');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

function gitCommitAndPush(cwd, msg) {
  exec('git add -A && git commit -m "' + msg.replace(/"/g, '\\"') + '" && git push', { cwd, timeout: 30000 }, (err, stdout, stderr) => {
    if (err) console.error('Git error:', err.message);
    else console.log('Git OK:', msg);
  });
}

const app = express();
const POSTS_DIR = path.join(__dirname, '_posts');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const name = Date.now() + '-' + Math.random().toString(36).slice(2, 8) + ext;
      cb(null, name);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 }
});

app.use(express.json());

// Serve editor page (no cache)
app.get('/', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.sendFile(path.join(__dirname, 'editor.html'));
});

// Search posts by keyword (matches title or body)
app.get('/api/search', (req, res) => {
  const q = (req.query.q || '').trim().toLowerCase();
  if (!q) {
    // No query: return all posts for browsing/delete
    const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
    const results = [];
    for (const f of files) {
      const raw = fs.readFileSync(path.join(POSTS_DIR, f), 'utf-8');
      const titleMatch = raw.match(/^title:\s*"?([^"\n]+)"?/m);
      const dateMatch = f.match(/^(\d{4}-\d{2}-\d{2})/);
      results.push({
        file: f.replace('.md', ''),
        title: titleMatch ? titleMatch[1] : '无题',
        date: dateMatch ? dateMatch[1] : '',
        excerpt: ''
      });
    }
    results.sort((a, b) => b.file.localeCompare(a.file));
    return res.json(results);
  }
  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
  const results = [];
  for (const f of files) {
    const raw = fs.readFileSync(path.join(POSTS_DIR, f), 'utf-8');
    const body = raw.replace(/^---[\s\S]*?---/, '');
    const titleMatch = raw.match(/^title:\s*"?([^"\n]+)"?/m);
    const title = titleMatch ? titleMatch[1] : '无题';
    const bodyLower = body.toLowerCase();
    const titleLower = title.toLowerCase();
    if (bodyLower.includes(q) || titleLower.includes(q)) {
      const dateMatch = f.match(/^(\d{4}-\d{2}-\d{2})/);
      const idx = bodyLower.indexOf(q);
      const start = Math.max(0, idx - 30);
      const excerpt = idx >= 0 ? body.substring(start, idx + q.length + 80) : '';
      results.push({
        file: f.replace('.md', ''),
        title: title,
        date: dateMatch ? dateMatch[1] : '',
        excerpt: excerpt ? '...' + excerpt + '...' : ''
      });
    }
  }
  results.sort((a, b) => b.file.localeCompare(a.file));
  res.json(results);
});

// Get about page content
app.get('/api/about', (req, res) => {
  const aboutPath = path.join(__dirname, 'about.md');
  if (!fs.existsSync(aboutPath)) return res.json({ content: '' });
  const raw = fs.readFileSync(aboutPath, 'utf-8');
  const bodyMatch = raw.match(/^---[\s\S]*?---\n?([\s\S]*)$/);
  res.json({ content: bodyMatch ? bodyMatch[1].trim() : raw.trim() });
});

// Save about page content
app.post('/api/about', (req, res) => {
  const { content } = req.body;
  if (content === undefined) return res.status(400).json({ error: '内容不能为空' });
  const aboutPath = path.join(__dirname, 'about.md');
  const raw = fs.readFileSync(aboutPath, 'utf-8');
  const fmMatch = raw.match(/^---([\s\S]*?)---/);
  const frontmatter = fmMatch ? '---' + fmMatch[1] + '---\n\n' : '';
  fs.writeFileSync(aboutPath, frontmatter + content, 'utf-8');
  gitCommitAndPush(__dirname, '更新关于页面');
  res.json({ ok: true, message: '关于页面已保存，后台发布中...' });
});

// Upload image
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '没有图片' });
  res.json({ url: '/xjjwri/uploads/' + req.file.filename });
});

// Delete post
app.delete('/api/delete', (req, res) => {
  const { file } = req.body;
  if (!file) return res.status(400).json({ error: '未指定文件' });
  const filePath = path.join(POSTS_DIR, file + '.md');
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: '文件不存在' });
  fs.unlinkSync(filePath);
  gitCommitAndPush(__dirname, '删除日记: ' + file);
  res.json({ ok: true, message: '已删除，后台发布中...' });
});

// Publish post
app.post('/api/publish', (req, res) => {
  const { title, content, date } = req.body;
  if (!title || !content) return res.status(400).json({ error: '标题和内容不能为空' });

  const d = date ? new Date(date) : new Date();
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:00`;
  const slug = title.replace(/\s+/g, '-');
  const filename = `${yy}-${mm}-${dd}-${slug}.md`;

  const frontmatter = `---
title: "${title}"
date: ${yy}-${mm}-${dd} ${time}
---

`;

  fs.writeFileSync(path.join(POSTS_DIR, filename), frontmatter + content, 'utf-8');
  gitCommitAndPush(__dirname, '新日记: ' + title);
  res.json({ ok: true, file: filename, message: '发布成功！' });
});

app.listen(3000, '0.0.0.0', () => {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  console.log('\n📔 日记编辑器已启动！\n');
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`   手机打开: http://${net.address}:3000`);
      }
    }
  }
  console.log('\n按 Ctrl+C 停止\n');
});
