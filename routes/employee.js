'use strict';

const express = require('express');
const moment = require('moment');
const uuid = require('uuid').v4;
const router = express.Router();
const externalApiUtils = require('../utils/externalApiUtils');

const DATABASE = {};

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
        if (value.toLowerCase() === 'ceo') {
          const ceoExists = Object.keys(DATABASE).find((id) => (DATABASE[id].role.toLowerCase() === 'ceo'));
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
  externalApiUtils.getQuote()
  .then((quote) => {
    DATABASE[newId] = {
      ...createDatabaseEntryFromReqBody(reqBody),
      quote
    };
  })
  .finally(() => {
    res.sendStatus(201);
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

/**
 * Validates the specified field in the given object, with configurable options.
 * @param {*} obj The object that contains the field/property to be validated
 * @param {*} fieldName The name of the field to validate
 * @param {*} options Object for customization of validation approach
 * `options.dataType` - specifies the required data type for the value of the given field.
 * `options.allowedValues` - specifies an array that represents an enum of values allowed for the given field.
 * `options.allowedValuesCaseSensitive` - specifies whether the values in `options.allowedValues` are to be case sensitive. Only applicable to strings. Defaults to true if omitted.
 * `options.custom` - specifies a custom callback function to perform highly specific validation.
 * `options.reqMethod` - specifes the HTTP request method used in the current flow
 * `options.required` - object that defined whether the field is required for a given HTTP method. All are true if omitted.
 * `options.required.post` - boolean that specifies whether the field is required for a HTTP POST request. True if omitted
 * `options.required.put` - boolean that specifies whether the field is required for a HTTP PUT request. True if omitted
 * The callback function receives the `fieldName` and the value of the field. It should return
 * a string to be used as an error response, if the value is invalid, `undefined` otherwise.
 * @returns string | undefined - string if the object is invalid (the return value is an error message), undefined otherwise.
 */
const validateField = (obj, fieldName, options) => {
  let isRequired = true;
  if (options.required && options.reqMethod) {
    if (options.required.hasOwnProperty(options.reqMethod.toLowerCase())) {
      isRequired = options.required[options.reqMethod.toLowerCase()];
    }
  }

  const existence = validateFieldExistence(obj, fieldName);
  if (isRequired && existence) {
    // If the field is required and it's missing, return the error.
    return existence;
  } else if (!isRequired && existence) {
    // If it's not required and it's not present, return immediately to skip all further validation.
    return;
  }

  if (options.dataType) {
    const dataType = validateFieldType(obj, fieldName, options.dataType);
    if (dataType) {
      return dataType;
    }
  }

  if (options.allowedValues) {
    const caseSensitive = options.hasOwnProperty('allowedValuesCaseSensitive') ? options.allowedValuesCaseSensitive : true;
    const allowedValues = validateFieldValueEnum(obj, fieldName, options.allowedValues, caseSensitive);
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

const validateFieldValueEnum = (obj, fieldName, allowedValues, caseSensitive) => {
  let updatedAllowedValues = allowedValues;
  let updatedFieldValue = obj[fieldName];

  // If case insensitive matching, convert all strings to lowercase
  if (!caseSensitive) {
    updatedAllowedValues = allowedValues.map((allowedValue) => {
      if (typeof allowedValue === 'string') {
        return allowedValue.toLowerCase();
      } else {
        return allowedValue;
      }
    });

    if (typeof updatedFieldValue === 'string') {
      updatedFieldValue = updatedFieldValue.toLowerCase();
    }
  }

  if (updatedAllowedValues.indexOf(updatedFieldValue) === -1) {
    return `The value of property [${fieldName}] is invalid. It should be one of ${allowedValues.join(', ')}.`;
  }
};

module.exports = router;
