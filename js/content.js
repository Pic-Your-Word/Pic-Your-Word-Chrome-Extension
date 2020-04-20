// global variables
var tooltipCreated = false;
var keyCode = 'empty';
var timeout = null;
var tooltipMaxWidth = 20;
var tooltipMaxHeight = 30;
var triggerKey = undefined; // default undefined
var extensionState = undefined; // default undefined
var definitionState = undefined;

function pixel_to_rem(pixel) {
    return pixel / parseFloat($("body").css("font-size"));
}

function rem_to_pixel(rem) {
    return rem * parseFloat($("body").css("font-size"));
}

function prepare_tooltip_location(event) {
    let xOffset = rem_to_pixel(tooltipMaxWidth);
    let yOffset = rem_to_pixel(tooltipMaxHeight);
    let mouseX = event.clientX;
    let mouseY = event.clientY;
    let pageX = event.pageX;
    let pageY = event.pageY;
    let pageFix = 40;

    if (mouseX > $(window).width() - xOffset) {
        pageX -= xOffset;
    }
    if (mouseY > $(window).height() + pageFix - yOffset) {
        pageY -= yOffset;
    }

    return [pageX, pageY];
}

function getSelectedText(event) {
    // get highlighted text and mouse location
    let text = get_selected_text();
    let x, y;
    createToolTip(event.pageX, event.pageY, text);
}

async function createToolTip(x, y, text) {

    let state_now = await extension_is_on();
    if (!state_now) {
        return;
    }

    let defState = await definition_state_is_on();

    // create a tooltip and append it to the given location
    if (tooltipCreated) {
        removeToolTip();
    }

    chrome.runtime.sendMessage({
            contentScriptQuery: "queryText",
            searchText: text
        },
        function(response) {
            response = JSON.parse(response);

            let tooltipPicture = document.createElement("img");
            tooltipPicture.className = 'cardd-img-top';
            let tooltip = document.createElement('div');
            tooltip.className = 'cardd tooltip';
            let body = document.createElement('div');
            body.className = 'cardd-body';
            let title = document.createElement('p')
            title.className = 'cardd-title';
            let def = document.createTextNode(response['title']);
            title.appendChild(def)
            let bodyText = document.createElement('p');
            bodyText.className = 'cardd-text';

            let inner = response['definition'];
            console.log(response['link']);
            if (response['deftype'] == 'pagedef') {
                bodyText.innerHTML = response['definition'];
                bodyText.innerHTML += "<a target='_blank' href=" + response['link'] + ">Wikipedia</a>";
            } else {
                if (response['link'] != -1) {
                    bodyText.innerHTML = response['definition'] + '... ';
                    bodyText.innerHTML += "<a target='_blank' href=" + response['link'] + ">Wikipedia</a>";
                } else {
                    bodyText.innerHTML = response['definition'] + '... ';
                }
            }

            let tooltipContainer = document.createElement('div');
            tooltipContainer.style.padding = '0 1rem 1rem 1rem';
            tooltipContainer.style.lineHeight = 1.6;

            if (defState) {
                tooltipContainer.appendChild(title);
                tooltipContainer.appendChild(bodyText);
            }

            tooltip.style.left = x + "px";
            tooltip.style.top = y + 10 + "px";
            tooltip.style.position = 'absolute';
            tooltip.style.zIndex = 200000000000;

            tooltip.style.maxWidth = tooltipMaxWidth + 'rem';
            tooltip.style.maxHeight = tooltipMaxHeight + 'rem';
            tooltip.style.width = tooltipMaxWidth + 'rem';

            tooltipPicture.style.maxHeight = '18rem';
            tooltipPicture.style.maxWidth = '20rem';
            tooltipPicture.style.minHeight = '10rem ';
            tooltipPicture.style.minWidth = '10rem ';
            tooltipPicture.style.objectFit = "cover";

            tooltipPicture.src = response['imgSource'];

            if (tooltipPicture.src.includes('**isempty**') && !defState) {
                tooltipPicture.src = chrome.runtime.getURL("icons/notFound_.png");
            }

            if (!tooltipPicture.src.includes('**isempty**') || !defState) {
                tooltip.appendChild(tooltipPicture)
            }

            body.appendChild(tooltipContainer)
            tooltip.appendChild(body);

            let t = document.getElementsByTagName("BODY")[0];
            t.appendChild(tooltip);
            tooltipCreated = true;
        }
    );

}

function removeToolTip() {
    $('.cardd').remove();
    tooltipCreated = false;
}

// set_key_code and key_is_pressed work together to detect
// and to validate key press constantly
function set_key_code(e) {
    let timeLimit = 800;
    clearTimeout(timeout);
    if (e.keyCode == 90) {
        keyCode = "90";
    } else if (e.altKey) {
        keyCode = "18";
    } else {
        keyCode = "empty";
    }
    timeout = setTimeout(function() {
        keyCode = 'empty'
    }, timeLimit);
}

function key_is_pressed() {
    return new Promise((resolve, reject) => {
        get_triggerKey()
            .then(keyState => {
                resolve(keyCode == keyState);
            })
    })

}

function get_selected_text() {
    return window.getSelection().toString();
}

function selected_text_not_empty() {
    return window.getSelection() && window.getSelection().toString() != "";
}

function extension_is_on() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['stateTurnedOn'], function(result) {
            resolve(result.stateTurnedOn);
        });
    })
}

function turn_extension_on() {
    chrome.storage.local.set({
        'stateTurnedOn': true
    }, function() {});
}

function turn_extension_off() {
    chrome.storage.local.set({
        'stateTurnedOn': true
    }, function() {});
}

function definition_state_is_on() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['definitionStateTurnedOn'], function(result) {
            resolve(result.definitionStateTurnedOn);
        });
    })
}

function turn_definition_state_off() {
    chrome.storage.local.set({
        'definitionStateTurnedOn': false
    }, function() {});
}

function turn_definition_state_on() {
    chrome.storage.local.set({
        'definitionStateTurnedOn': true
    }, function() {});
}

function get_triggerKey() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['triggerKey'], function(result) {
            console.log('getTriggerKey: ' + result.triggerKey);
            resolve(result.triggerKey);
        });
    })
}

function initialize_all_state() {
    return new Promise((resolve, reject) => {
        extension_is_on()
            .then(extensionState_ => {
                if (extensionState_ == undefined) {
                    extensionState_ = true;
                }

                extensionState = extensionState_;

                definition_state_is_on()
                    .then(definitionState_ => {
                        if (definitionState_ == undefined) {
                            definitionState_ = true;
                        }
                        definitionState = definitionState_;

                        chrome.storage.local.set({
                            'stateTurnedOn': extensionState
                        }, function() {});
                        chrome.storage.local.set({
                            'definitionStateTurnedOn': definitionState
                        }, function() {});

                        get_triggerKey()
                            .then(triggerKeyState => {
                                if (triggerKeyState == undefined) {
                                    triggerKeyState = 'empty';
                                }
                                chrome.storage.local.set({
                                    'triggerKey': triggerKeyState
                                }, function() {});
                                resolve(1);
                            })

                    })
            })
    });
}

$(document).ready(function() {
    initialize_all_state().then(_ => {
        // initialize settings and start detection event loop
        document.addEventListener("keydown", function(event) {
            set_key_code(event);
        })

        document.addEventListener("click", function(event) {
            key_is_pressed()
                .then(val => {
                    if (val && selected_text_not_empty()) {
                        getSelectedText(event);
                    } else {
                        removeToolTip();
                    }
                })
        });


    })
});
