const getInscriptionsToBuy = async (maxPrice, maxNumber, maxTotal, collection, page = 1) => {
    const pageLimit = 20;
    let {results} = await (await fetch(`https://api.bioniq.io/v1/inscriptions?collection=${collection}&status=listed&sort=price_asc&page=${page}&limit=${pageLimit}`)).json();
    let newMaxTotal = maxTotal;
    let nexPageResults = [];
    let lastPage = true;
    if (results.length == pageLimit) lastPage = false;
    results = results.filter((inscription) => inscription.psbt == '')
    let availableResults = results.length;
    if (maxPrice){
        results = results.filter((inscription) => {
            return inscription.price <= maxPrice;
        })
    }
    if (maxTotal){
        let total = 0;
        results = results.filter((inscription) => {
            total += inscription.price;
            return total <= maxTotal;
        });
        newMaxTotal = maxTotal - total;
    }
    if (maxNumber){
        if (results.length > maxNumber){
            results = results.slice(0, maxNumber);
        }
    }
    if (!lastPage) {
        nexPageResults = await getInscriptionsToBuy(maxPrice, (maxNumber ? maxNumber-availableResults : 0), newMaxTotal, collection, page + 1);
    }
    return [...results, ...nexPageResults];
};
const doConcurrent = (fn, set, threads, debug, waitTime = 1000) => {
    var thisSet = set.map((a,i) => [a,i]);
    var total = set.length;
    if (debug) console.log("Processing", total, "items!");
    var alertThreshold = 100;

    var lastAlert = total-alertThreshold;
    return new Promise((resolve, reject) => {
        var ct = 0, completed = [];
        function processNext(rt){
        if (rt) ct--;
        if (ct < threads) {
            if (thisSet.length) {
            if (thisSet.length < lastAlert) {
                if (debug) console.log("Processed", total-thisSet.length, "of", total);
                lastAlert -= alertThreshold;
            }
            ct++;
            (async d => {
                try {
                    await fn(d[0], d[1]);
                    completed.push(d);
                    processNext(true);
                } catch(e) {
                    if (debug) console.log("BUG", e.message || e, d);
                    thisSet.unshift(d);
                    waitNext(true);
                };
            })(thisSet.shift());
            if (thisSet.length) {
                waitNext();
            }
            } else {
            if (ct == 0) resolve(true);
            };
            
        }
        };
        function waitNext(rt){
        if (rt) ct--;
        setTimeout(() => {
            processNext();
        }, waitTime);
        };
        processNext();
    });
};
const getAllOwnedInscriptions = async (address) => {
    return (await (await fetch(`https://api.bioniq.io/v1/getWrappedForVoltAddress/${address}`)).json()).ordinals;
}

function isValidP2wpkhAddress(address) {
    const regex = /^bc1([qpzry9x8gf2tvdw0s3jn54khce6mua7l]{39}|[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{59})$/;
    return regex.test(address);
  }
module.exports = {isValidP2wpkhAddress, getInscriptionsToBuy, doConcurrent, getAllOwnedInscriptions};