
var express = require('express');
var path = require('path');
var logger = require('morgan');
var bodyParser = require('body-parser');
var neo4j = require('neo4j-driver');
var neo4j = require('neo4j-driver').v1;
var app = express();
var http = require('http');                                                                                   
var fs = require('fs');
var formidable = require("formidable");
var util = require('util');
var nodemailer = require('nodemailer');
var hostnameField='';
var problemField='';
var priorityField =''; 
var mailField='';
var searchField='';
var router = express.Router();
app.set('views', path.join(__dirname,'views'));
app.set('view engine','ejs');
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));
app.use(express.static(path.join(__dirname,'public')));
app.use(router);

var driver = neo4j.driver('bolt://localhost', neo4j.auth.basic('neo4j', ''));
const session = driver.session();

/*
 *This function takes a hostname or cluster and creates the node, if it does not exist already.
 */
function createCluster(cluster){
const resultPromise = session.run(    
				  'MERGE (a:Cluster {name: $name}) RETURN a',
				  {name: cluster}
				  );
resultPromise.then(result => {
	session.close(); 
	const singleRecord = result.records[0];
	const node = singleRecord.get(0);
	console.log(node.properties.name);
    });

}
/*
 * This function creates the problem associated with the entered hostname, if it does not exist already.
 */

function createProblem(Problem){
    const resultPromise = session.run(
				     
                                      'MERGE (n:Problem{name:$problem}) RETURN n',
                                      {problem:Problem
				      });
    resultPromise.then(result => {
            session.close();
            const singleRecord = result.records[0];
            const node = singleRecord.get(0);
            console.log(node.properties.name);                                                                                     \
                                                                                                                                      
        });
}
/*
 * Function that searchs the database for the entrend search field. Currently not in use.
 */

function search(searchField){
    //  file.open("w");
    session.run('MATCH p =(a { name:$searchField })-[r]->(b) RETURN *;',  {searchField:searchField})
	//{searchField:searchField}
	.subscribe(
		   {		       
		       onNext: function (record) {
			
			   var node = record.get('p');
			   logger.log(node);
		       },
			   onCompleted: function () {
			   session.close();
		       },
			   onError: function (error) {
			   console.log(error);
		       }
		   }
		   );       
}

/*
 * This function merges the entered hostname with the problem. 
 */
function mergeClusterProblem(Cluster,Problem){
    
    const resultPromise = session.run(
				      'MATCH (n:Cluster{name:$Cluster}),(b:Problem{name:$problem}) CREATE UNIQUE (n)-[r:Problem]->(b)',
				      {Cluster:hostnameField,problem:Problem});


    resultPromise.then(result => {
            session.close();

            const singleRecord = result.records[0];
            const node = singleRecord.get(0);

            console.log(node.properties.name);

        });
}

/*
 * This function sets the priority of the problem. 
 */

function SetClusterPriority(Priority,Problem){
   
    const resultPromise = session.run(
                                      'MATCH (n:Problem{name:$problemName}) SET n.Priority =$problem',
                                      {problem:Priority,problemName:Problem
                                      });
    resultPromise.then(result => {
            session.close();

            const singleRecord = result.records[0];
            const node = singleRecord.get(0);

            console.log(node.properties.name);
        });

}
/*
 * First thing that is recieved when the server starts listening. 
 */
app.get('/', function(req,res){
	res.sendFile(__dirname+'/views/index.html');
    });
/*
 * Posts the results of the submit button, calls process Fields Function. 
 */

app.post('/formDone',function(req,res){

	processFormFieldsIndividual(req,res);
	
});

app.get('/mail',function(req,res){
	if(mailField = 'True'){
	mail();
	}
    });

app.get('/button',function(req,res){

	res.sendFile(__dirname+'/views/index1.html');
    });

app.post('/formSearch',function(req,res){
	processFormFieldsSearch(req,res);
    });

/*
 * Displays the HTML page, first function that is called.
 */
function displayForm(res) {
    fs.readFile('./views/index.html', function (err, data) {
	    res.writeHead(200, {
		    'Content-Type': 'text/html',
			'Content-Length': data.length
			});
	    res.write(data);
	    res.end();
	});
}

    function processFormFieldsSearch(req, res) {
	//Store the data from the fields in your data store.                                                                                                                             
	//The data store could be a file or database or any other store based                                                                                                            
	//on your application.                                                                                                                                                           
	var fields = [];
	var form = new formidable.IncomingForm();
	form.on('field', function (field, value) {
		console.log(field);
		console.log(value);
		fields[field] = value;
		if(field =='search'){
		    searchField = value;
		}		
	    });
	form.on('end', function () {
		                                                                                                                                   
		search(searchField);
		res.send(__dirname+'/log.json');
	    });
	form.parse(req);
    }

/*
 * Process the text boxes associated with the HTML page.
 */
function processFormFieldsIndividual(req, res) {
    var fields = [];
    var form = new formidable.IncomingForm();
    form.on('field', function (field, value) {
	    console.log(field);
	    console.log(value);
	    fields[field] = value;
	    if(field =='hostname'){
	    hostnameField = value;	    
	    }
	    if(field=='problem'){
	   
		problemField = value;
	    }
	    if(field ='priority'){
		priorityField = value;
		if(value ==1){
		    mail();
		}
	    }
	});

    form.on('end', function () {
	    createCluster(hostnameField);
	    createProblem(problemField);
	    mergeClusterProblem(hostnameField,problemField);
	    SetClusterPriority(priorityField,problemField);
	    //	    search();
	
	    res.writeHead(200, {
		    'content-type': 'text/plain'
			});
	    res.write('received the data:\n\n');
	    res.end(util.inspect({
			fields: fields
			    }));
	});
    form.parse(req);
}
function mail(){
    var transporter = nodemailer.createTransport('smtps://example@gmail.com:password@smtp.gmail.com'
    );
var mailOptions = {
    from: '',
    to: '',
    subject: 'Server Alert',
    text: hostnameField+' '+problemField+' ' +priorityField
};
transporter.sendMail(mailOptions, function(error, info){
	if (error) {
	    console.log(error);
	} else {
	    console.log('Email sent: ' + info.response);
	}
    });
}

app.listen(3000);
console.log('Server Started on port 3000');
module.exports = app;
