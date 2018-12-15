var http=require('http');
var jsmsgbus = require('./messagecore/jsmsgbus');

 
http.createServer(function(req,res){
    res.writeHead(200,{'Content-Type':'text/plain'});
    res.end('hello node.js');
}).listen(3000,'localhost',function(){
    console.log('Server running at http://localhost:3000');
});
