const axios = require('axios');

const getRonSwansonQuote = () => {
    return axios.get('https://ron-swanson-quotes.herokuapp.com/v2/quotes')
    .then((response) => {
        if (response.status === 200 &&
            Array.isArray(response.data) &&
            response.data.length > 0 &&
            typeof response.data[0] === 'string') {
            return response.data[0];
        } else {
            console.log('Successful response returned, but the data format is incorrect.');
            return "No quote found :(";
        }
    })
    .catch((err) => {
        console.log("Unsuccessful response returned.", err);
        return "No quote found :(";
    });
};

module.exports = {
    getQuote: getRonSwansonQuote
};
