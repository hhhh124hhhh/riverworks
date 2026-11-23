const {createServer}=require('node:http');
const {createReadStream}=require('node:fs');
const {stat}=require('node:fs/promises');
const {resolve,sep,extname}=require('node:path');
const {spawn}=require('node:child_process');

const host='127.0.0.1';
const defaultPort=4177;
const port=Number(process.env.RIVERWORKS_PORT)||defaultPort;
const url='http://'+host+':'+port+'/';
const open=process.argv.includes('--open');
const root=__dirname;
const types={
  '.html':'text/html; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8',
  '.mp3':'audio/mpeg',
  '.wav':'audio/wav',
  '.webp':'image/webp'
};

function openBrowser() {
  if(!open)return;
  const launcher=process.platform==='win32'?'rundll32.exe':process.platform==='darwin'?'open':'xdg-open';
  const args=process.platform==='win32'?['url.dll,FileProtocolHandler',url]:[url];
  const child=spawn(launcher,args,{stdio:'ignore',windowsHide:true,detached:true});
  child.on('error',()=>console.log(url));
  child.unref();
}
const server=createServer(async (req,res)=>{
  try{
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
    const path=decodeURIComponent(new URL(req.url,url).pathname);
    if(path==='/health'){
      res.writeHead(200,{'Content-Type':'text/plain'});
      res.end('riverworks');
      return;
    }
    const file=resolve(root,'.'+(path==='/'?'/index.html':path));
    const type=types[extname(file)];
    if(!file.startsWith(root+sep)||!type){res.writeHead(404);res.end();return;}
    const info=await stat(file);
    if(!info.isFile()){res.writeHead(404);res.end();return;}
    res.writeHead(200,{'Content-Type':type,'Content-Length':info.size,'X-Content-Type-Options':'nosniff'});
    if(req.method==='HEAD'){res.end();return;}
    const stream=createReadStream(file);
    stream.on('error',()=>res.destroy());
    stream.pipe(res);
  }catch{
    if(!res.headersSent)res.writeHead(404);
    res.end();
  }
});

server.on('error',async error=>{
  if(error.code==='EADDRINUSE'){
    try{
      const response=await fetch(url+'health');
      if(await response.text()==='riverworks'){console.log(url);openBrowser();return;}
    }catch{}
  }
  process.exitCode=1;
  console.error(error.message);
});
server.listen(port,host,()=>{
  console.log(url);
  openBrowser();
});
