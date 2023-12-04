let spinner;
const logSpinner = (msg) => {
    process.stdout.write('\r');
    process.stdout.write('\r\x1b[K');
    console.log(msg);
}
const stopSpinner = (msg) => {
    clearInterval(spinner);
    process.stdout.write('\r');
    process.stdout.write('\r\x1b[K');
    if (msg) console.log(msg);
};
const changeSpinner = (msg, frames) => {
    stopSpinner(spinner);
    startSpinner(msg, frames);
};
const startSpinner = (msg, frames) => {
    let i = 0;
    spinner = setInterval(() => {
        process.stdout.write(`\r${frames[i++ % frames.length]} ${msg}`);
    }, 200);
}
module.exports = { startSpinner, stopSpinner, logSpinner, changeSpinner };