var http = require('http');
var url = require('url');
var path = require('path');
var fs = require('fs');

//Array of Mime Types
var mimeTypes = {
    "html": "text/html",
    "jpeg": "image/jpeg",
    "jpg": "image/jpg",
    "png": "image/png",
    "javascript": "text/javascript",
    "css": "text/css",
};

//create server

http.createServer(function (req) {
    var uri = url.parse(req.url).pathname;
    var fileName = path.join(process.cwd(), unescape(uri));
    console.log('Loading ' + uri);
    var stats;

    try{
    stats = fs.lstatSync(fileName);
    } catch {
    res.writeHead(404, {'Content-Type': 'text/plain'});
    res.write('404 not found');
    res.end();
    return;
    }
    //check if  file/directory
    

});