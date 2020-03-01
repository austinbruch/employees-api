// Get reference to significant DOM nodes
const employeesTbody = document.querySelector('#employeesTable');
const firstNameInput = document.querySelector('#firstName');
const lastNameInput = document.querySelector('#lastName');
const hireDateInput = document.querySelector('#hireDate');
const roleInput = document.querySelector('#role');
const addButton = document.querySelector('#addNewEmployee');

// Query the API for all employees
const getEmployees = () => {
    // Remove all existing rows
    while (employeesTbody.lastChild) {
        employeesTbody.removeChild(employeesTbody.lastChild);
    }

    // Call the API and update the UI accordingly
    axios.get('/api/employees')
    .then((response) => {
        console.log(response);
        if (response.status === 200) {
            // render the users in the table body
            response.data.forEach((emp) => {
                const newTableRow = document.createElement('tr');
                let newTableCell = document.createElement('td');
                newTableCell.innerText = emp.firstName;
                newTableRow.appendChild(newTableCell);
                newTableCell = document.createElement('td');
                newTableCell.innerText = emp.lastName;
                newTableRow.appendChild(newTableCell);
                newTableCell = document.createElement('td');
                newTableCell.innerText = emp.role;
                newTableRow.appendChild(newTableCell);
                newTableCell = document.createElement('td');
                newTableCell.innerText = emp.hireDate;
                newTableRow.appendChild(newTableCell);
                newTableCell = document.createElement('td');
                const deleteButton = document.createElement('button');
                deleteButton.innerText = 'Delete';
                deleteButton.addEventListener('click', (event) => {
                    deleteEmployee(emp._id)
                    .then((response) => {
                        console.log(response);
                    });
                });
                newTableCell.appendChild(deleteButton);
                newTableRow.appendChild(newTableCell);
                employeesTbody.appendChild(newTableRow);
            });
        }
    });
};

// Send the POST request to the API to create a new employee
const createEmployee = (firstName, lastName, hireDate, role) => {
    return axios.post('/api/employees', {
        firstName,
        lastName,
        hireDate,
        role
    });
};

// Delete a given employee
const deleteEmployee = (id) => {
    return axios.delete(`/api/employees/${id}`);
}

// Bind the event listener for the add button
addButton.addEventListener('click', (event) => {
    // No automatic form submit
    event.preventDefault();
    const firstName = firstNameInput.value;
    const lastName = lastNameInput.value;
    const hireDate = hireDateInput.value;
    const role = roleInput.value;
    createEmployee(firstName, lastName, hireDate, role)
    .then((response) => {
        console.log(response);
        if (response.status === 201) {
            // Successfully created!
            console.log('successfully created');
            // clear the form
            firstNameInput.value = null;
            lastNameInput.value = null;
            hireDateInput.value = null;
            roleInput.value = null;
            // reload the table
            getEmployees();
        } else {
            // error
            console.log('error', response.data);
        }
    })
    .catch((err) => {
        console.log(err);
    })
});

getEmployees();
