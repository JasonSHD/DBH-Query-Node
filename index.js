var express = require('express');
var app = express();
var request = require('request');
var oigService = require('./oig');
var htmlparser = require('htmlparser2');
var bodyParser = require('body-parser');
var _ = require('underscore');
var Q = require('q');
var easysoap = require('easysoap');

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
      'Accept': '*/*',
      'Cache-Control': 'no-cache',
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

/**
 * https://gw.sam.gov/SAMWS/1.0/ExclusionSearch
 */
app.get('/sam', function (req, res) {
  var params = {
    host: 'https://gw.sam.gov',
    path: '/SAMWS/1.0/ExclusionSearch',
    wsdl: '/SAMWS/1.0/ExclusionSearch?wsdl'
  };

  var soapClient = easysoap.createClient(params);

  soapClient.getAllFunctions()
    .then(function(funcArray) {
      console.log(funcArray);
    }).catch(function(error) {
      console.log(error);
      res.send(error);
    });

  soapClient.getMethodParamsByName('doSsnSearch')
    .then(function(funcArray) {
      console.log(funcArray);
      res.send(funcArray);
    }).catch(function(error) {
      console.log(error);
      res.send(error);
    });

  soapClient.call({
    method: 'doSsnSearch',
    params: {
      OperationExSSNSearchType: '595602000'
    }
  }).then(function(body) {
    console.log(body.response.body);
  }).catch(function(error) {
    console.log(error);
  });

  console.log('Sending wsdl request');
});

app.get('/oigInit', oigService);

app.listen(3001);
