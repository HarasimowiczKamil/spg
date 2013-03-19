exports.substr = function (input, from, to) {
    if (typeof to == 'undefined') {
        return input.toString().substr(from);
    }
    return input.toString().substr(from, to);
};