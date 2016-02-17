var request = require('request');
var htmlparser = require('htmlparser2');
var bodyParser = require('body-parser');
var _ = require('underscore');
var Q = require('q');

/**
 * Handles getting the information an a person from the OIG LEIE database.
 *
 * This has to be scraped as OIG has stated they will not expose an API
 * for the LEIE database.
 *
 * @param Object req The Express request object.
 * @param Object res The Express response object.
 *
 * @return oig The useable library object that has all of the oig functionality.
 */
function oig(req, res) {
  /**
   * This is the response data.
   */
  var data = {};

  /**
   * The container to keep persistant cookies from our requests.
   */
  var cookieJar = request.jar();

  /**
   * The fields required from the prefetch request.
   */
  var prefetchFields = [
    '__VIEWSTATE',
    '__VIEWSTATEGENERATOR',
    '__EVENTVALIDATION'
  ];

  /**
   * Inelegant, but used to track the 3 promises needed
   */
  var prefetchDeferred = [
    Q.defer(),
    Q.defer(),
    Q.defer()
  ];

  /**
   * The promise array for the prefetch.
   */
  var prefetchPromises = [];

  /**
   * The html parser to use for the prefetch response.
   *
   * @var htmlparser2.Parser
   */
  var prefetchParser = new htmlparser.Parser({
    onopentag: function(name, attribs) {
      var indexOfField;
      if (_.contains(prefetchFields, attribs.id)) {
        indexOfField = _.indexOf(prefetchFields, attribs.id);
        prefetchDeferred[indexOfField].resolve(attribs);
      }
    },
    ontext: function (text) {
      // Not needed
    },
    onclosetag: function (tagname) {
      // Not needed
    }
  }, {decodeEntities: true});

  /**
   * The html parser to use to look for any results for the given name.
   *
   * @var htmlparser2.Parser
   */
  var resultParser = new htmlparser.Parser({
    onopentag: function(name, attribs) {
      if (attribs.class === "searched-name") {
        console.log(attribs);
      }
    },
    ontext: function (text) {
    },
    onclosetag: function (tagname) {
    }
  });

  /**
   * Required parameters for this endpoint.
   */
  var requiredParams = [
    'lastName',
    'firstName'
  ];

  // Setup our wrappered request object with default header values.
  request = request.defaults({
    jar: cookieJar,
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.103 Safari/537.36'
    }
  });

  // Validation of endpoint request.
  if (validateRequest() !== null) {
    res.status(400).send(validateRequest());
  }

  // Start the fetch chain to oig.
  request('https://exclusions.oig.hhs.gov/', function(error, response, body) {
    /**
     * Initialize the prefetch promise mechanism.
     */
    _.each(prefetchDeferred, function(element, index, list) {
      prefetchPromises[index] = element.promise;
    });

    if (!error && response.statusCode === 200) {
      prefetchParser.write(body);
      prefetchParser.end();

      Q.allSettled(prefetchPromises)
        .then(function (results) {
          var prefetchParams = _.map(results, function(item){ return item.value });
          fullRequest(assembleParams(prefetchParams))
            .then(function(data) {
              // Find any entries
              //
              resultParser.write(data);
              resultParser.end();
              res.send(data);
            });
        });
    } else {
      res.status(500).send(error);
    }
  });

  /**
   * This pulls together all of the required parameters that we need for the search post.
   *
   * @param Object prefetch This is the fields we previously scraped from the starting page.
   *
   * @return Object The finalized post parameters.
   */
  function assembleParams(prefetch) {
    var paramList = {};

    // Map the dynamic values that we had to scrape from the starting page.
    _.each(prefetch, function(element) {
      paramList[element.id] = element.value;
    });

    /**
     * These are the settable fields for the request's post.
     */
    paramList['__EVENTTARGET'] = '';
    paramList['__EVENTARGUMENT'] = '';
    paramList['__SCROLLPOSITIONX'] = 0;
    paramList['__SCROLLPOSITIONY'] = 0;
    paramList['ctl00$cpExclusions$txtSPLastName'] = req.query.lastName;
    paramList['ctl00$cpExclusions$txtSPFirstName'] = req.query.firstName;

    // This is the anti-bot portion of the request.  The OIG site posts what the coords
    // are for the button push (where on the button you clicked).  We make this random
    // in an attempt to fool the app.
    paramList['ctl00$cpExclusions$ibSearchSP.x'] = Math.floor((Math.random() * 80) + 1);
    paramList['ctl00$cpExclusions$ibSearchSP.y'] = Math.floor((Math.random() * 24) + 1);

    return paramList;
  };

  /**
   * Validate that the request to the endpoint has the required parameters.
   *
   * @return Object The missing parameters or null if everything is accounted for.
   */
  function validateRequest() {
    var paramsDiff = _.difference(requiredParams, _.allKeys(req.query));
    if (paramsDiff.length !== 0) {
      return {error: { message: 'Missing Params', details: paramsDiff}};
    }
    return null;
  }

  /**
   * The main controller for the full request for individual OIG info.
   *
   * @param Object reqParams The main parameters to use for the request.
   *
   * @return Promise The promised results.
   */
  function fullRequest(reqParams) {
    // Create our promise structure.
    var fullDeferred = Q.defer();

    // Build request.
    var options = {
      url: 'https://exclusions.oig.hhs.gov',
      uri: '/default.aspx',
      method: 'POST',
      headers: [
        {
          name: 'content-type',
          value: 'application/x-www-form-urlencoded'
        }
      ],
      postData: {
        mimeType: 'aplication/x-www-form-urlencoded',
        params: reqParams
      }
    };

    // Fire main request function (which will recursively handle redirects).
    dataRequest(options.url, options.uri, reqParams, fullDeferred);

    return fullDeferred.promise;
  }

  /**
   * The raw data request for a specific name.
   *
   * @param String  url         The url (without trailing slash) of the OIG site.
   * @param String  uri         The endpoint to post to.
   * @param Object  reqParams   The post params to use for the request.
   * @param Promise reqDeferred The promise to use for resolving or rejecting.
   *
   * @return void The return is handled by the promise passed in.
   */
  function dataRequest(url, uri, reqParams, reqDeferred) {
    // Fire main request.
    request.post(url + uri, {form: reqParams}, function(error, response, body) {
      // Make sure we handle redirects gracefully and set a base rule for recursion.
      if (response.statusCode >= 300 && response.statusCode < 400) {
        // RECURSION!
        dataRequest(url, response.headers.location, reqParams, reqDeferred);
      } else {
        if (!error) {
          reqDeferred.resolve(body);
        } else {
          console.log(error);
          reqDeferred.resolve(error);
        }
      }
    });
  }
}

// Support object typing.
module.exports = oig;
