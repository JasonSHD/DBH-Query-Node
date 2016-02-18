var _ = require('underscore');

/**
 * So far, all of the endpoints have the same parameter requirements.  This function
 * handles the validation of the required parameters to an endpoint.
 *
 * @param Objec req The Express request object.
 *
 * @return Object The parameters missing or null if it validates.
 */
function validate(req) {
  /**
   * Required parameters for the endpoints.
   */
  var requiredParams = [
    'lastName',
    'firstName'
  ];

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

  // Currently only supports one function, but kept abstracted in case I need to add
  // more functionality.
  return validateRequest(req);
}

module.exports = validate;
