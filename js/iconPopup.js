var optionToKeyCode = ['','empty','90','18', '16'];
var keyCodeToOption = {'empty': 1, '90': 2, '18': 3};

$(document).ready(function() {
    chrome.storage.local.get(['stateTurnedOn'], function(result) {
        $('#stateButton_').prop('checked', result.stateTurnedOn);
    });
    chrome.storage.local.get(['definitionStateTurnedOn'], function(result) {
        $('#definitionButton_').prop('checked', result.definitionStateTurnedOn);
    });
    chrome.storage.local.get(['triggerKey'], function(result) {
        $('#triggerKey').val(String(keyCodeToOption[result.triggerKey]));
    });
});


$('#stateButton_').change(function(){

    if ($('#stateButton_').prop('checked')) {
        chrome.storage.local.set({'stateTurnedOn': true}, function() {
            console.log("turned on");
        });
    }
    else {
        chrome.storage.local.set({'stateTurnedOn': false}, function() {
            console.log("turned off");
        });
    }
});

$('#definitionButton_').change(function() {
    if ($('#definitionButton_').prop('checked')) {
        chrome.storage.local.set({'definitionStateTurnedOn': true}, function() {
            console.log("turned on");
        });
    }
    else {
        chrome.storage.local.set({'definitionStateTurnedOn': false}, function() {
            console.log("turned off");
        });
    }
});

$('#triggerKey').change(function() {

    let value = $('#triggerKey').val();  // value is a string
    value = optionToKeyCode[value];

    chrome.storage.local.set({'triggerKey': value}, function() {
        console.log("Trigger key set to " + value);
    });
});
