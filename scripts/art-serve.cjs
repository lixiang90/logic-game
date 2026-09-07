const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(process.argv[2]||'out');
const prefix=process.env.ART_SERVE_PREFIX||'';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.mp3':'audio/mpeg','.woff2':'font/woff2','.txt':'text/plain'};
http.createServer((req,res)=>{
 try {
  let url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(prefix && url!==prefix && !url.startsWith(prefix+'/')) {res.writeHead(404).end();return;}
  url=url.slice(prefix.length);
  let file=path.resolve(root,'.'+(url||'/'));
  if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  if(!fs.existsSync(file)){res.writeHead(404).end('Not found');return;}
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);
 }catch {res.writeHead(400).end();}
}).listen(Number(process.env.ART_PORT||4175),'127.0.0.1',()=>console.log('Static art preview: http://127.0.0.1:'+(process.env.ART_PORT||4175)+prefix+'/'));
