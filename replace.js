const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      results.push(file);
    }
  });
  return results;
}

const files = walk('frontend/src');
files.forEach(f => {
  if (f.endsWith('.ts') || f.endsWith('.tsx')) {
    let content = fs.readFileSync(f, 'utf8');
    if (content.includes('http://localhost:3000')) {
      content = content.replace(/http:\/\/localhost:3000/g, 'https://teachguard-backend-84878824642.asia-northeast3.run.app');
      fs.writeFileSync(f, content);
      console.log('Updated', f);
    }
  }
});
