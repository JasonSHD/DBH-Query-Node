var express = require('express');
var app = express();
var request = require('request');
var oigService = require('./oig');
var samService = require('./sam');
var htmlparser = require('htmlparser2');
var bodyParser = require('body-parser');
var _ = require('underscore');
var Q = require('q');
var easysoap = require('easysoap');
var soap = require('soap');

app.use(bodyParser());

app.get('/', function(req, res) {
  console.log(req);
  res.send('functional', 200);
});

app.post('/', function(req, res) {
  _.each(req.body, function(element, index, list) {
    console.log(index);
    console.log(' --- ' + element);
  });
  res.status(200).send('functional');
});

app.get('/whatbrowser', function(req, res) {
  request = request.defaults({
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.103 Safari/537.36'
    }
  });

  request.get('https://whatbrowser.org', function (error, response, body) {
      console.log(response.request.headers);
    if (!error) {
      res.send(body);
    } else {
      res.send(error);
    }
  });
});

app.get('/sam', samService);

app.get('/oigInit', oigService);

app.listen(3001);
