chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.contentScriptQuery == "queryText") {
            var url = "http://en.wikipedia.org/w/api.php?action=query&titles="
            url += request.searchText
            url += "&redirects&prop=pageimages&format=json&pithumbsize=500";

            var result = {};

            fetch(url)
                .then(r => r.text())
                .then(imgResponse => {
                    imgResponse = JSON.parse(imgResponse);

                    // check if pageid exists
                    if (check_nested_json(
                            imgResponse,
                            'query',
                            'pages',
                            Object.keys(imgResponse['query']['pages'])[0])) {

                        // page does not exist
                        if (Object.keys(imgResponse['query']['pages'])[0] == -1) {
                            result['pageid'] = -1;
                            result['title'] = '';
                            result['imgSource'] = prepare_img_error_message();

                            // page exists
                        } else {
                            // prepare image source
                            if (check_nested_json(
                                    imgResponse,
                                    'query',
                                    'pages',
                                    Object.keys(imgResponse['query']['pages'])[0],
                                    'thumbnail', 'source')) {

                                for (var key in imgResponse.query.pages) {
                                    result['pageid'] = imgResponse.query.pages[key].pageid;
                                    result['imgSource'] = imgResponse.query.pages[key].thumbnail.source;
                                    result['title'] = imgResponse.query.pages[key].title;
                                }
                            } else {
                                result['imgSource'] = prepare_img_error_message();
                                for (var key in imgResponse.query.pages) {
                                    result['pageid'] = imgResponse.query.pages[key].pageid;
                                    result['title'] = imgResponse.query.pages[key].title;

                                }
                            }

                        }
                    } else {

                        result['title'] = '';
                        result['imgSource'] = prepare_img_error_message();
                        result['pageid'] = -1;

                    }

                    // send definition request
                    search_definition(result['title'], result['pageid'], request.searchText)
                        .then(defResponse => {
                            if (result['title'] == '') {
                                result['title'] = request.searchText;
                            }

                            if (result['pageid'] == -1) {
                                result['deftype'] = 'snippet';
                                result['definition'] = defResponse[0];
                                result['pageid'] = defResponse[1];
                            } else {
                                result['deftype'] = 'pagedef';
                                result['definition'] = defResponse;
                            }

                            search_link(result['pageid'])
                                .then(linkResponse => {
                                    result['link'] = linkResponse;

                                    sendResponse(JSON.stringify(result));
                                })
                        })

                })
            return true;
        }
    });

function search_link(redirectedPageid) {

    var link_url = "https://en.wikipedia.org/w/api.php?action=query&prop=info&pageids="
    link_url += redirectedPageid + "&inprop=url&format=json";

    if (redirectedPageid != -1) {
        return new Promise((resolve, reject) => {
            fetch(link_url)
                .then(r => r.text())
                .then(linkResponse => {
                    linkResponse = JSON.parse(linkResponse);

                    if (check_nested_json(
                            linkResponse,
                            'query',
                            'pages',
                            redirectedPageid,
                            "fullurl")) {
                        link_result = linkResponse['query']['pages'][redirectedPageid]['fullurl'];
                    } else {
                        link_result = prepare_def_error_message();
                    }

                    resolve(link_result);

                });
        });
    } else {

        link_result = -1;
        resolve(link_result);

    }
}


function search_definition(redirectedTitle, redirectedPageid, searchText) {
    var def_url_snippet = "https://en.wikipedia.org/w/api.php?action=query"
    def_url_snippet += "&list=search&prop=info&inprop=url&utf8=&format=json&origin=*&srsearch=";

    var def_url_whole = "https://en.wikipedia.org/w/api.php?format=json&action=query";
    def_url_whole += "&prop=extracts&exintro&explaintext&redirects=1&titles=";

    var searchUrl;
    var result;
    if (redirectedPageid != -1) {
        searchUrl = def_url_whole + redirectedTitle;

        return new Promise((resolve, reject) => {
            fetch(searchUrl)
                .then(r => r.text())
                .then(defResponse => {
                    defResponse = JSON.parse(defResponse);

                    // prepare definition
                    var rest = ['query',
                        'pages',
                        Object.keys(defResponse['query']['pages'])[0],
                        'extract'
                    ];

                    if (check_nested_json(defResponse,
                            'query',
                            'pages',
                            Object.keys(defResponse['query']['pages'])[0],
                            'extract')) {

                        result = '<div class="tipDefinition">';
                        result += defResponse['query']['pages'][Object.keys(defResponse['query']['pages'])[0]]['extract']
                        result += '</div>';
                        result = result.split('.')[0] + '.';
                    } else {
                        resolve(defResponse['query']['pages'][Object.keys(defResponse['query']['pages'])[0]]['extract'])
                        result = prepare_def_error_message();
                    }

                    resolve(result);
                });
        });
    } else {
        searchUrl = def_url_snippet + searchText;

        return new Promise((resolve, reject) => {
            fetch(searchUrl)
                .then(r => r.text())
                .then(defResponse => {
                    defResponse = JSON.parse(defResponse);

                    // prepare definition
                    var rest = ['query', 'search', 0, 'snippet'];
                    if (check_nested_json(defResponse, 'query', 'search', 0, 'snippet')) {
                        let l = '<div class="tipDefinition">';
                        l += defResponse['query']['search'][0]['snippet'] + '</div>';
                        let r = defResponse['query']['search'][0]['pageid'];
                        result = [l, r];
                    } else {
                        result = prepare_def_error_message();
                    }

                    resolve(result);
                });
        });
    }

}

function fetch_definition(url, ...rest) {
    var result = "";
    return new Promise((resolve, reject) => {
        fetch(url)
            .then(r => r.text())
            .then(defResponse => {
                defResponse = JSON.parse(defResponse);

                // prepare definition
                resolve(defResponse.query.pages[Object.keys(defResponse['query']['pages'])[0]].extract)
                if (check_nested_json(defResponse, rest)) {
                    result = get_nested_json(defResponse, rest)
                    result = '<div class="tipDefinition">' + result + '</div>';
                } else {
                    result = prepare_def_error_message();
                }

                resolve(result);
            });
    });
}

function check_nested_json(dict, ...rest) {
    if (rest.length == 0) {
        return true;
    }
    let key = rest.shift();
    if (dict[key] == undefined) {
        return false;
    }
    return check_nested_json(dict[key], ...rest)
}

function get_nested_json(dict, ...rest) {
    var result = '';
    var next = rest.shift();
    while (next != undefined) {
        result = dict[next];
        next = rest.shift();
    }
    return result;
}

function sendEmail() {
    var emailUrl = "mailto:baizhongfu1@gmail.com";
    chrome.tabs.create({
        url: emailUrl
    }, function(tab) {
        setTimeout(function() {
            chrome.tabs.remove(tab.id);
        }, 500);
    });
}

function prepare_img_error_message() {
    return "**isempty**";
}

function prepare_def_error_message() {
    return "No definition found.";
}
