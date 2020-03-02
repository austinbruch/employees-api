'use strict';

const express = require('express');
const router = express.Router();
const uuid = require('uuid').v4;

const DATABASE = {
  [uuid()]: {
    firstName: 'asf',
    lastName: 'asdf',
    hireDate: '2020-02-29',
    role: 'CEO'
  }
};

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
      custom: () => undefined // TODO - this is where we need to validate the date format, and that the date is in the past
    }
  },
  {
    fieldName: 'role',
    options: {
      dataType: 'string',
      allowedValues: ['CEO', 'VP', 'MANAGER', 'LACKEY'],
      custom: () => undefined // TODO - this is where we need to enforce uniqueness on the CEO role
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
  let newId = uuid();
  DATABASE[newId] = {
    firstName: reqBody.firstName,
    lastName: reqBody.lastName,
    hireDate: reqBody.hireDate,
    role: reqBody.role
  };
  // TODO still need to add the 2 externally-populated fields
  res.sendStatus(201);
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
  DATABASE[id] = {
    firstName: reqBody.firstName,
    lastName: reqBody.lastName,
    hireDate: reqBody.hireDate,
    role: reqBody.role
  };

  // TODO still need to support the 2 externally-populated fields
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
 * Validates a request payload representing a new or updated employee resource.
 * If the resource is invalid, the appropriate response is sent.
 * @param {*} req - request
 * @param {*} res - response
 * @returns {boolean} true if the payload is valid, false otherwise.
 */
const validateEmployee = (req, res) => {
  for (let i = 0; i < employeeFieldValidations.length; i++) {
    const validation = employeeFieldValidations[i];
    const isInvalid = validateField(req.body, validation.fieldName, validation.options);
    if (isInvalid) {
      res.status(400).send({
        result: isInvalid
      });
      return false;
    }
  }
  return true;
}

/**
 * Validates the specified field in the given object, with configurable options.
 * @param {*} obj The object that contains the field/property to be validated
 * @param {*} fieldName The name of the field to validate
 * @param {*} options Object for customization of validation approach
 * `options.dataType` - specifies the required data type for the value of the given field.
 * `options.allowedValues` - specifies an array that represents an enum of values allowed for the given field.
 * `options.custom` - specifies a custom callback function to perform highly specific validation.
 * The callback function receives the `fieldName` and the value of the field. It should return
 * a string to be used as an error response, if the value is invalid, `undefined` otherwise.
 * @returns string | undefined - string if the object is invalid (the return value is an error message), undefined otherwise.
 */
const validateField = (obj, fieldName, options) => {
  const existence = validateFieldExistence(obj, fieldName);
  if (existence) {
    return existence;
  }

  if (options.dataType) {
    const dataType = validateFieldType(obj, fieldName, options.dataType);
    if (dataType) {
      return dataType;
    }
  }

  if (options.allowedValues) {
    const allowedValues = validateFieldValueEnum(obj, fieldName, options.allowedValues);
    if (allowedValues) {
      return allowedValues;
    }
  }

  if (options.custom) {
    const custom = options.custom(fieldName, obj[fieldName]);
    if (custom) {
      return custom;
    }
  }
};

const validateFieldExistence = (obj, fieldName) => {
  if (!obj.hasOwnProperty(fieldName)) {
    return `Required property [${fieldName}] is missing from the request payload.`;
  }
};

const validateFieldType = (obj, fieldName, dataType) => {
  if (typeof obj[fieldName] !== dataType) {
    return `The value of property [${fieldName}] is not the correct data type. It should be [${dataType}].`;
  }
};

const validateFieldValueEnum = (obj, fieldName, allowedValues) => {
  if (allowedValues.indexOf(obj[fieldName]) === -1) {
    return `The value of property [${fieldName}] is invalid. It should be one of ${allowedValues.join(', ')}.`;
  }
};

module.exports = router;
