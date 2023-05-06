// ==UserScript==
// @name         TD Easyweb -> GNU Cash
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Convert the list of Easyweb transactions to gnuCash entries
// @author       Huzefa Dargahwala
// @match        https://easyweb.td.com/waw/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @require      https://gist.github.com/raw/2625891/waitForKeyElements.js
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.4/moment.min.js
// @run-at       document-end
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @grant        GM.xmlHttpRequest

// ==/UserScript==

(function() {
    'use strict';

    const simpleHash = function(s) {
        var h = 0, l = s.length, i = 0;
        if ( l > 0 )
            while (i < l)
                h = (h << 5) - h + s.charCodeAt(i++) | 0;
        return h;
    };
    const allTransactionsDiv = ".td-layout-row ng-star-inserted"

    function createHash(transaction) {
        var value = "";
        transaction.forEach((element) => {
            value += element;
        });
        return simpleHash(value);
    }

    function createTransactionForRow(rowElement) {
        const transaction = [];
        rowElement
            .find("td")
            .each(function(index) {
            // Don't process anything more than the required data, in this case Balance field
            if(index > 3) {
                return;
            }
            const innerValue = $(this).html().replace(/!|-|>|</g,'');
            // Process date
            if(index == 0) {
                const date = moment(innerValue, "MMM DD, YYYY")
                const formattedDate = date.format("YYYY-MM-DD")
                transaction.push(formattedDate);
                return;
            }

            // Process Debit and Credit values
            if(index == 2 || index == 3) {
                const dollarValue = innerValue.replace('$', '');
                if(dollarValue.length == 0) {
                    transaction.push('0');
                } else {
                    transaction.push(dollarValue);
                }
                return;
            }
            // Add description
            transaction.push(innerValue);
        });
        return transaction;
    }

    function createTransactionStagingDiv() {
        var stagingDiv = $("<div id='transaction-staging'></div>");
        stagingDiv.css({
            "position": "fixed",
            "top": "1em",
            "right": "1em",
            "background-color": "lightGreen",
            "width": "300px",
            "height": "1000px"
        });
        $(".home-ev-wrapper").append(stagingDiv);
    }

    function updateStagingDiv(allTransactions) {
        var addedTransactions = "";
        for(const [key, transaction] of Object.entries(allTransactions)) {
            for(const item of transaction) {
                addedTransactions += item + ";"
            }
            addedTransactions = addedTransactions.substring(0, addedTransactions.length - 1);
            addedTransactions += "<br/>";
        }
        $("#transaction-staging").html(addedTransactions);
    }

    function onCreditCardStatementAvailable() {
        console.log("Running for CreditCardStatement");
        var allTransactions = {};
        $(".uf-table-row-clickable").each( function(index) {
            const currentRow = $(this);
            const transaction = createTransactionForRow(currentRow);
            const transactionHash = createHash(transaction);
            currentRow.attr("transactionHash", transactionHash);
            var addMeButton = $('<button/>', {
                text: " + ",
                click: function(event) {
                    event.stopPropagation();
                    allTransactions[transactionHash] = transaction;
                    console.log(allTransactions);
                    updateStagingDiv(allTransactions);
                }
            });
            $(this).append(addMeButton);
        });
        createTransactionStagingDiv()
    }


    // tests to confirm the user is logged into jira and can make requests via api
    async function test()
    {
        waitForKeyElements("#ccaaSummaryAvailableCredit", onCreditCardStatementAvailable);
    }

    console.log("Userscript Running");
    setTimeout(()=> {
        console.log("Waiting for page to load");
        test();
    }, 10000);
})();
