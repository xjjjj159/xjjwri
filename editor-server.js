const express = require('express');
const multer = require('multer');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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

// Serve editor page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'editor.html'));
});

// Search posts by keyword
app.get('/api/search', (req, res) => {
  const q = (req.query.q || '').trim().toLowerCase();
  if (!q) return res.json([]);
  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
  const results = [];
  for (const f of files) {
    const raw = fs.readFileSync(path.join(POSTS_DIR, f), 'utf-8');
    const body = raw.replace(/^---[\s\S]*?---/, '').toLowerCase();
    if (body.includes(q)) {
      const titleMatch = raw.match(/^title:\s*"?([^"\n]+)"?/m);
      const dateMatch = f.match(/^(\d{4}-\d{2}-\d{2})/);
      const excerpt = body.substring(Math.max(0, body.indexOf(q) - 30), body.indexOf(q) + q.length + 80);
      results.push({
        file: f.replace('.md', ''),
        title: titleMatch ? titleMatch[1] : '无题',
        date: dateMatch ? dateMatch[1] : '',
        excerpt: '...' + excerpt + '...'
      });
    }
  }
  // Sort by filename (which includes date) descending
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
  try {
    execSync('git add about.md', { cwd: __dirname });
    execSync('git commit -m "更新关于页面"', { cwd: __dirname });
    execSync('git push', { cwd: __dirname, timeout: 30000 });
    res.json({ ok: true, message: '关于页面已更新并发布！' });
  } catch (e) {
    res.json({ ok: true, message: '关于页面已保存，请稍后运行 push.bat 发布' });
  }
});

// Upload image
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '没有图片' });
  res.json({ url: '/xjjwri/uploads/' + req.file.filename });
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

  try {
    execSync('git add -A', { cwd: __dirname });
    execSync(`git commit -m "新日记: ${title}"`, { cwd: __dirname });
    execSync('git push', { cwd: __dirname, timeout: 30000 });
    res.json({ ok: true, file: filename, message: '发布成功！' });
  } catch (e) {
    // Git push failed but file is saved
    res.json({ ok: true, file: filename, message: '日记已保存，请稍后运行 push.bat 发布' });
  }
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
