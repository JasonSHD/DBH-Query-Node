var validation = require('./validate');

var request = require('request');
var htmlparser = require('htmlparser2');
var bodyParser = require('body-parser');
var _ = require('underscore');
var Q = require('q');

/**
 * This is the functionality for pulling exclusion information from the SAM API.
 *
 * @param Object req The Express request object.
 * @param Object res The Express response object.
 *
 * @see http://gsa.github.io/sam_api/sam/index.html
 */
function sam(req, res) {
  /**
   * The base URL for the SAM api.
   *
   * @var String
   */
  var samURL = 'https://api.data.gov/sam/v2/registrations?';

  /**
   * The authentication portion of the SAM api request.
   *
   * @var String
   */
  var auth = '&api_key=G1Be3Xqx0BZuycC2wFaIBDAapp1gtl9InbvpQpUE';

  /**
   * The query parameters to use for the SAM api request.
   *
   * @var String
   */
  var params = [];

  // Verify we have the required parameters.
  if (validation(req) !== null) {
    res.status(400).send(validation(req));
  }

  // Create the segments of the params
  _.each(req.query, function(element, index, list) {
    params.push('(' + index + ':' + element + ')');
  });

  // Attach the parameters to the base request URL.
  samURL += 'qterms=';
  for (var i = 0, max = params.length; i<max; i++) {
    samURL += params[i];
    if (i < (max-1)) {
      samURL += '+AND+';
    }
  }

  // Fire the request out and return the results.
  request(samURL + auth, function(error, response, body) {
    if (!error) {
      res.send(body);
    } else {
      res.status(400).send(error);
    }
  });
}

module.exports = sam;
