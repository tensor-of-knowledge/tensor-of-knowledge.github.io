#!/usr/bin/node

var express = require("express");
var bodyParser = require('body-parser');
var CryptoJS = require("crypto-js");

const exec = require('child_process').exec;
var fs = require("fs");
var app = express();

app.use(bodyParser.json());

app.get(/^(.+)$/, function(req, res){ 
    res.sendFile( __dirname + req.params[0]); 
});

  app.post("/build", function(req, res) { 
	/* some server side logic */
    console.log(CryptoJS.AES.encrypt("ABC", "Secret Passphrase").toString())
	try {
        make(req.body.latex,req.body.entryName,req.body.magicCode,req.body.commitChanges,res);
    } catch(e) {
        console.log(e)
        res.send({err: "<strong>Parse error!</strong>"});
    }
  });

  app.post("/open", function(req,res) {
    try {
        texenc = fs.readFileSync("data-src/" + req.body.entryName + ".tex.aes","utf8");
    } catch(e) {
        res.send({err:"Can't open entry <strong>" + req.body.entryName + "</strong>!"});
        return 0;
    }
    try {
        tex = CryptoJS.AES.decrypt(texenc, req.body.magicCode).toString(CryptoJS.enc.Utf8);
    } catch(e) {
        res.send({err:"The code <strong>" + req.body.magicCode + "</strong> for entry <strong>" + req.body.entryName + "</strong> is wrong!"});        
        return 0;
    }
        console.log(tex);
        //res.sendStatus(500);
        res.send({latex:tex});
  });

  app.post("/push", function(req,res) {
    try {
        fs.createReadStream("sandbox/" + req.body.entryName + ".tex.aes").pipe(fs.createWriteStream("data-src/" + req.body.entryName + ".tex.aes"));
        fs.createReadStream("sandbox/" + req.body.entryName + ".html").pipe(fs.createWriteStream("data/" + req.body.entryName + ".html"));
        latex = fs.readFileSync("sandbox/" + req.body.entryName + ".tex").toString();
        vars = latex.split("%VARS%")[1].split("%! ").join("");
        console.log(vars);
        vars = JSON.parse(vars);
        var com = fs.readFileSync("strings/commits.txt").toString();
        if(com.split(req.body.entryName).length == 1) {
            com = '<tr><td class="short-name"><a href="data/' + req.body.entryName +'.html">' + req.body.entryName + '</a></td><td class="title">' + vars["TITLE"] + '</td><td class="tags">' + vars["TAGS"] + '</td></tr>\n' + com;
            fs.writeFileSync("strings/commits.txt",com);           
        }
        ind = fs.readFileSync("template/index.html").toString();
        ind = ind.split("%COMMITS%").join(com);
        fs.writeFileSync("index.html",ind);
        res.send({});
    } catch(e) {
        res.send({err:"Can't push entry <strong>" + req.body.entryName + "</strong>!"});
        console.log(e);
        return 0;
    }
  });

  app.post("/list", function(req, res) { 
    /* some server side logic */
    try {
        console.log("list");
        list = fs.readdirSync("data-src");
        res.send({list:list});
    } catch(e) {
        res.send({err:"I/O error!"});
    }
  });



var port = process.env.PORT || 5000;
	app.listen(port, function() {
	console.log("Listening on " + port);
});

function make(latex,entryName,magicCode,ch,res) {
	fs.writeFileSync("sandbox/" + entryName + ".tex",latex);
    encsrc = CryptoJS.AES.encrypt(latex, magicCode).toString();
    fs.writeFile('sandbox/' + entryName + ".tex.aes",encsrc);
    vars = latex.split("%VARS%")[1].split("%! ").join("");
    console.log(vars);
    vars = JSON.parse(vars);
	exec('pdflatex -halt-on-error -shell-escape sandbox/' + entryName + '.tex; rm ' + entryName + '.aux; rm ' + entryName + '.log; mv ' + entryName + '.pdf sandbox/' + entryName + '.pdf',function() {
		install("sandbox/" + entryName + ".tex",magicCode,vars,ch,res);
	});
}

function install(file,magicCode,vars,ch,res) {
    try {
        var dt = new Date();
        var b = fs.readFileSync(file.split('.tex').join(".pdf"));
        base64 = Buffer(b).toString('base64');
        fs.writeFileSync(file.split('.tex').join(".base64"),base64);   
        enctext = CryptoJS.AES.encrypt(base64, magicCode).toString();
        fs.writeFile(file.split('.tex').join('.pdf') + ".aes",enctext);
        var html = fs.readFileSync("template/page.html").toString();
        html = html.split('%PDF%').join(enctext);
        html = html.split('%CONDENSEDHEADER%').join(file.split('.tex').join('').split('sandbox/').join(''));
        var j = JSON.parse(fs.readFileSync("strings/page.json"));
        for(var k in j) {
            m = j[k];
            r = j[k][Math.floor(Math.random()*j[k].length)];
            html = html.split("%" + k + "%").join(r);
        }
        var ij = vars;
        for(var k in ij) {
            html = html.split("%" + k + "%").join(ij[k]);
        }
        html = html.split('%UPDATED%').join(dt.getDate() + "/" + (dt.getMonth()+1) + "/" + dt.getFullYear());
        html = html.split('%COMMIT_CHANGES%').join(ch);

        console.log(ch);
        fs.writeFileSync(file.split('.tex').join(".html"),html);
        console.log(file.split('.tex').join(".html"));
        res.send({});
    } catch(e) {
        res.send({err:"<strong>Latex compiler error!</strong>"});
        console.log(e);
    }        
}