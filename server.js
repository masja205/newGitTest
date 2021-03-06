var express = require('express');
var app = express();
var port = process.env.PORT || 8080;
var apicache = require('apicache');
var cache = apicache.middleware;
var ERROR_LOG = console.error.bind(console);
var env = process.env.NODE_ENV || 'development';
var DATABASE_URL = "postgres://ndnppozorkaoxr:GBHxoghFJ6u2Aj7qX68YeWvsQY@ec2-54-243-212-122.compute-1.amazonaws.com:5432/d9evbre3bo2548"


//Set up DB
var pg = require('pg');

pg.defaults.ssl = true;
pg.connect(process.env.DATABASE_URL, function(err, client) {
  if (err) throw err;
  console.log('Connected to postgres! Getting schemas...');

  client
    .query('SELECT table_schema,table_name FROM information_schema.tables;')
    .on('row', function(row) {
     // console.log(JSON.stringify(row));
    });
});

/* forces all traffic to be https - code amended from here:
 * http://stackoverflow.com/questions/7185074/heroku-nodejs-http-to-https-ssl-forced-redirect
 */
 
 var forceSsl = function (req, res, next) {
    if (req.headers['x-forwarded-proto'] !== 'https') {
        return res.redirect(['https://', req.get('Host'), req.url].join(''));
    }
    return next();
 };
app.use(forceSsl);

//Import Yahoo Weather
var YQL = require('yql');


//var Client = require('pg-native');
//var client = new Client();

//client.connectSync('postgres://Depot:5432/nwen304');

// html, css and js files - TODO
app.use(express.static(__dirname));
app.use(express.static(__dirname+ '/images'));


var bodyParser = require('body-parser')
app.use( bodyParser.json() );      // to support JSON­encoded bodies 
app.use(bodyParser.urlencoded({    // to support URL­encoded bodies 
  extended: true
}));

//Accessible at localhost:8080/ 
app.get('/', function (req, res) { 
  res.sendFile(__dirname+'/index.html');
});

app.listen(port, function () { 
  console.log('Listening on port 8080'); 
});


/* recieve requests for mens items. from here we need to query database for the perticular type of item, generate a page
of that item and send it back to the client */
app.get('/m*', function(req, res){
	var item = req.path;
	console.log(item);
	res.sendFile(__dirname+'/subPages/mensWear.html');
});

/* recieves requests for womans items. Same as above for what we need to do*/
app.get('/w*', function(req, res){
	var item = req.path;
	console.log(item);
	res.sendFile(__dirname+'/subPages/womansWear.html');
});

/* again for kids items*/
app.get('/k*', function(req, res){
	var item = req.path;
	console.log(item);
	res.sendFile(__dirname+'/subPages/childrensWear.html');
});

app.get('/data/*', function(req, res){

	var path = req.path;
	var path = path.split('/');
	pathName = path[path.length-2];
	pathName += '/' +  path[path.length-1];
	console.log("_________testing____________");
	console.log(pathName);
	console.log("_____________________");
  	res.setHeader('Cache-Control', 'public, max-age=65000000');
	  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
	  	var QUERY_STRING = "SELECT * FROM STOCK WHERE ProductCategory = '"+ pathName +"';"
    client.query(QUERY_STRING, function(err, result) {
      done();
      if (err)
       { console.error(err); res.send("Error " + err); }
      else
       { res.json(result.rows); }
    });
  });
});

app.get('/cart/*', function(req, res){

	var id = req.path;
	id = id.split('=');
	id = id[id.length-1];
	console.log("++++++++++++++++++++++");
	console.log(id);
	console.log("++++++++++++++++++++++");
	res.setHeader('Cache-Control', 'public, max-age=65000000');
	
	 pg.connect(process.env.DATABASE_URL, function(err, client, done) {
	 var QUERY_STRING = "select * from stock where itemid in(select itemID from cart where userID = '"+id+"');"
       var ids = [];
    client.query(QUERY_STRING, function(err, result) {
      done(); 
      if (err)
       { console.error(err); res.send("Error " + err); }
      else
       {
       res.json(result.rows);
       }
    });
  });
});

app.post('/add/*', function(req, res){

	var itemid = req.body.itemid;
	var userid = req.body.ID
	var amt = 1;
		console.log("_________testing____________");
	console.log(itemid);
	console.log(userid);
	console.log("_____________________");
	  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
	  	var QUERY_STRING = "INSERT INTO cart (itemID, quantity, userID) values('"+itemid+"', '"+amt+"', '"+userid+"');"
    client.query(QUERY_STRING, function(err, result) {
      done();
      if (err)
       { console.error(err); res.send("Error " + err); }

    });
  });
});


app.post('/remove/*', function(req, res){

	var item = req.body.itemid;
	var user = req.body.ID
	console.log("_________testing____________");
	console.log(item);
	console.log(user);
	console.log("_____________________");
	  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
	  	var QUERY_STRING = "DELETE from cart where itemID = '"+item+"' AND userID = '"+user+"';"
    client.query(QUERY_STRING, function(err, result) {
      done();
      if (err)
       { console.error(err); res.send("Error " + err); }

    });
  });
});


app.post('/removeall/*', function(req, res){

	
	var user = req.body.ID
	console.log("_________testing____________");
	
	console.log(user);
	console.log("_____________________");
	  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
	  	var QUERY_STRING = "DELETE from cart where userID = '"+user+"';"
    client.query(QUERY_STRING, function(err, result) {
      done();
      if (err)
       { console.error(err); res.send("Error " + err); }

    });
  });
});




// Search redirect 
app.get('/search', function(req,res){
  var item = req.path;
  res.sendFile(__dirname+'/search.html');
})

app.get('/search*', function(req,res){
  var item = req.query.searchterm;
  
  item.replace("'","");

	 pg.connect(process.env.DATABASE_URL, function(err, client, done) {
	 var QUERY_STRING = "SELECT * FROM STOCK WHERE lower(ItemName) LIKE '%" + item + "%' OR lower(productcategory) LIKE '%" + item + "%';"
    client.query(QUERY_STRING, function(err, result) {
      done();
      if (err)
       { console.error(err); res.send("Error " + err); }
      else
       { res.json(result.rows); }
    });
  });


})

// Register

app.post('/register', function(req,res){
  var info = req.body;

    if(info.id == undefined || info.id == null){
        console.log('User not logged into FB');
        res.sendFile(__dirname+'/register.html');
        return
    }

  pg.connect(process.env.DATABASE_URL, function(err, client, done) {

    //Check if user already exists
    var QUERY_STRING = ("SELECT UserId FROM users WHERE UserId = '" + info.id + "';");
    client.query(QUERY_STRING,function(err,result){
      done();
      if(err)
      {
        console.error(err); res.send("Error " + err);
        return
      }
      else
      {
        var resultLength = result.rows.length;
        if(resultLength > 0 ){
          res.sendFile(__dirname+'/regoRedirect.html');
          return
        }
        else{
          //If user is not found, add to DB
                   var QUERY_STRING = "INSERT INTO users (UserId,fName,lName,gender,email,phoneNum,address,city,country,dob) VALUES('"+ info.id +"','"+ info.name.split(" ")[0] +"','"+             info.name.split(" ")[1] +"','"+ info.gender +"','"+ info.email +"','"+ info.phone +"','"+ info.add +"','"+ info.city +"','"+ info.cntry +"','"+ info.dob+"');"
          client.query(QUERY_STRING, function(err, result) {
            done();
            if (err)
             { console.error(err); res.send("Error " + err);}
            else
             {
               res.sendFile(__dirname+'/index.html');
             }
          });
        }
      }
    });
  });
  
});

// Login

app.get('/login', function(req,res){
  var id = req.query.id;
  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
   var QUERY_STRING = "SELECT UserId FROM users WHERE UserId = '" + id + "';";
    client.query(QUERY_STRING, function(err, result) {
      done();
      if (err)
       { console.error(err); res.send("Error " + err); }
      else
       {
           //If no rows updated then no such user in db
           if(result.rows.length ==0){
               res.send(false);
           }
           else{
               res.send(true);
           }
       }
    });
  });
})


// Product Recommendation

app.get('/recommend', function(req,res){
  
   var query = new YQL("select title, units.temperature, item.forecast from weather.forecast where woeid in (select woeid from geo.places where text='Brisbane, Australia') limit 1;");
  
  query.exec(function(err,data){
    //var location = data.query.results.channel.location;
    //var condition = data.query.results.channel;
    console.log(data.query.results.channel);
  }); 
})

var ERROR_LOG = console.error.bind(console);

