const axios = require('axios');

const getRandomRonSwansonQuote = () => {
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

const getRandomDadJoke = () => {
    return axios.get('https://icanhazdadjoke.com/', {
        headers: {
            accept: 'application/json'
        }
    })
    .then((response) => {
        if (response.status === 200 &&
            typeof response.data === 'object' &&
            response.data.hasOwnProperty('joke') &&
            typeof response.data.joke === 'string') {
                return response.data.joke;
        } else {
            console.log("Successful response returned, but the data format is incorrect.");
            return "No joke found :(";
        }
    })
    .catch((err) => {
        console.log("Unsuccessful response returned.", err);
        return "No joke found :(";
    });
}

module.exports = {
    getJoke: getRandomDadJoke,
    getQuote: getRandomRonSwansonQuote
};
