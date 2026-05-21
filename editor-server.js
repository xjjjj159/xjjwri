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
