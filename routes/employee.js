'use strict';

const express = require('express');
const moment = require('moment');
const uuid = require('uuid').v4;

const externalApiUtils = require('../utils/externalApiUtils');
const validateField = require('../utils/validation');

const router = express.Router();

// In-memory database for employees
const DATABASE = {};

// Validation configuration for each field of an employee resource
const employeeFieldValidations = [
  {
    fieldName: 'firstName',
    options: {
      dataType: 'string'
    }
  },
  {
    fieldName: 'lastName',
    options: {
      dataType: 'string'
    }
  },
  {
    fieldName: 'hireDate',
    options: {
      dataType: 'string',
      custom: (fieldName, value) => {
        const format = 'YYYY-MM-DD';
        const momentObj = moment(value, format, true);
        if (!momentObj.isValid()) {
          return `The value [${value}] for property [${fieldName}] is invalid. The required format is [${format}].`;
        }
        if (momentObj.isAfter(moment())) {
          return `The value [${value}] for property [${fieldName}] is invalid, because it is in the future.`;
        }
      }
    }
  },
  {
    fieldName: 'role',
    options: {
      dataType: 'string',
      allowedValues: ['CEO', 'VP', 'MANAGER', 'LACKEY'],
      allowedValuesCaseSensitive: false,
      custom: (fieldName, value) => {
        const ceoRole = 'ceo';
        if (value.toLowerCase() === ceoRole) {
          const ceoExists = Object.keys(DATABASE).find((id) => (DATABASE[id].role.toLowerCase() === ceoRole));
          if (ceoExists) {
            return 'This employee cannot be created because there is already an employee with the [CEO] role and there can only be one.';
          }
        }
      }
    }
  },
  {
    fieldName: 'quote',
    options: {
      dataType: 'string',
      required: {
        post: false,
        put: true
      }
    }
  },
  {
    fieldName: 'joke',
    options: {
      dataType: 'string',
      required: {
        post: false,
        put: true
      }
    }
  }
];

/* GET employees listing. */
router.get('', function(req, res) {
  // Map the database object to an array for the API response
  return res.send(Object.keys(DATABASE).map((id) => ({
    ...DATABASE[id],
    _id: id
  })));
});

/**
 * GET individual employee resource
 */
router.get('/:id', (req, res) => {
  const id = req.params.id;
  if (DATABASE.hasOwnProperty(id)) {
    return res.status(200).send({
      ...DATABASE[id],
      _id: id
    });
  } else {
    return res.status(404).send({
      result: `Resource with id [${id}] not found.`
    });
  }
});

/**
 * POST new employee resource
 */
router.post('', (req, res) => {
  const reqBody = req.body;

  // Validate the request payload
  const isValid = validateEmployee(req, res);
  if (!isValid) {
    return;
  }

  // Assuming we got this far, we're all good on validations
  const newEmployee = createDatabaseEntryFromReqBody(reqBody);
  let newId;
  externalApiUtils.getQuote()
  .then((quote) => {
    newEmployee.quote = quote;
    return externalApiUtils.getJoke();
  })
  .then((joke) => {
    newEmployee.joke = joke;
    newId = uuid();
    while (DATABASE.hasOwnProperty(newId)) {
      // Generate a new uuid on the off chance we hit a collision. This is very unlikely.
      newId = uuid();
    }
    DATABASE[newId] = {
      ...newEmployee,
      joke
    };
  })
  .finally(() => {
    res.header('Location', `${req.protocol}://${req.get('host')}${req.originalUrl}/${newId}`).sendStatus(201);
  });
});

/**
 * PUT /api/employeed/:id route
 * Updates the resource at the specified ID with the request body
 * 204 No Content is sent in the success case
 * 404 Not Found is sent if the specified id doesn't exist
 * 400 Bad Request is sent if the request body doesn't contain all required fields with valid values
 */
router.put('/:id', (req, res) => {
  const id = req.params.id;
  const reqBody = req.body;
  
  if (!DATABASE.hasOwnProperty(id)) {
    res.status(404).send({
      result: `A resource with id [${id}] does not exist, and therefore cannot be updated.`
    });
    return;
  }
  
  // Validate the request payload
  const isValid = validateEmployee(req, res);
  if (!isValid) {
    return;
  }

  // If we got this far, the request payload is valid, let's update the database.
  DATABASE[id] = createDatabaseEntryFromReqBody(reqBody);

  res.sendStatus(204);
});

/**
 * DELETE /api/employees/:id route
 * Deletes the requested employee and returns 204 No Content
 * Even if the requested employee doesn't exist, a 204 is sent.
 * I could probably be convinced to do a 404 in that case instead.
 */
router.delete('/:id', (req, res) => {
  const id = req.params.id;
  if (DATABASE.hasOwnProperty(id)){
    delete DATABASE[id];
  }
  res.sendStatus(204);
});

/**
 * Utility method that creates an object ready for the database from a HTTP request body object
 * This essentially strips out any rogue, unsupported properties in the request body so only the
 * supported properties are included in the database entry.
 * @param {*} reqBody request body JSON object
 * @returns object ready for the database
 */
const createDatabaseEntryFromReqBody = (reqBody) => {
  const result = {
    firstName: reqBody.firstName,
    lastName: reqBody.lastName,
    hireDate: reqBody.hireDate,
    role: reqBody.role.toUpperCase()
  };
  if (reqBody.quote) {
    result.quote = reqBody.quote;
  }
  if (reqBody.joke) {
    result.joke = reqBody.joke;
  }
  return result;
};

/**
 * Validates a request payload representing a new or updated employee resource.
 * If the resource is invalid, the appropriate response is sent.
 * @param {*} req - request
 * @param {*} res - response
 * @returns {boolean} true if the payload is valid, false otherwise.
 */
const validateEmployee = (req, res) => {
  for (let i = 0; i < employeeFieldValidations.length; i++) {
    const validation = employeeFieldValidations[i];
    const isInvalid = validateField(req.body, validation.fieldName, {
      ...validation.options,
      reqMethod: req.method
    });
    if (isInvalid) {
      res.status(400).send({
        result: isInvalid
      });
      return false;
    }
  }
  return true;
}

module.exports = router;
