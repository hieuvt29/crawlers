var request = require('request');
var cheerio = require('cheerio');
var fs = require('fs');

var suppliers = {
    macbook: 'https://www.thegioididong.com/laptop-apple-macbook',
    dell: 'https://www.thegioididong.com/laptop-dell',
    acer: 'https://www.thegioididong.com/laptop-acer',
    asus: 'https://www.thegioididong.com/laptop-asus',
    lenovo: 'https://www.thegioididong.com/laptop-lenovo'
}

function getItemUrls(suppliers, callback) {
    var itemUrls = {}
    Object.keys(suppliers).forEach(function (supplier) {
        var link = suppliers[supplier];
        request(link, function (err, response, body) {
            if (!err && response.statusCode == 200) {
                var $ = cheerio.load(body);
                var website = 'https://www.thegioididong.com';
                var urls = [];
                $('ul.laptopzoom > li').each(function () {
                    var a = $(this).find('a');
                    var url = $(a).attr('href');
                    urls.push(website + url);
                })
                itemUrls[supplier] = urls;
                if (Object.keys(itemUrls).length == Object.keys(suppliers).length) {
                    callback(null, itemUrls);
                }
            } else console.log('Error');
        })
    })
}

function getFullSpec(productId) {
    var url = 'https://www.thegioididong.com/aj/ProductV4/GetFullSpec/';
    return new Promise((resolve, reject) => {
        request.post({
            url: url,
            body: {
                productID: productId
            },
            json: true
        }, function (err, res, body) {
            if (err) {
                return reject(err);
            }
            var imgKit = body.imgKit;
            var $ = cheerio.load(body.spec);

            var label = null;
            var spec = {};
            $('li').each(function () {
                let self = $(this);
                if (self.find('label').length) {
                    label = self.find('label').text();
                    spec[label] = {}

                    // console.log("label: ", label);
                } else {
                    let attr, val;
                    if (self.find('span').find('div').length) {
                        attr = self.find('span').find('div').text();
                        val = $(self.find('div')[1]).text();
                    } else {
                        attr = self.find('span').text();
                        val = self.find('div').text();
                    }
                    spec[label][attr] = val;
                    // console.log("attr: ", attr, "val: ", val);
                }
            })
            spec.imgKit = imgKit;
            return resolve(spec);
        })
    });

}

function getItemImages(productId, imageType, colorID) {
    var url = 'https://www.thegioididong.com/aj/ProductV4/GallerySlideFT/';
    return new Promise((resolve, reject) => {
        request.post({
            url: url,
            body: {
                productID: productId,
                imageType: imageType,
                colorID: colorID
            },
            json: true
        }, function (err, res, body) {
            if (err) {
                reject(err);
            } else {
                var $ = cheerio.load(body);
                var imgLinks = [];
                $('.caption_ps').each(function () {
                    var self = $(this);
                    imgLinks.push(self.attr('data-img'));
                })

                resolve(imgLinks);
            }
        });
    });
}
async function getItemInfo(url) {
    var item = {};
    return new Promise((resolve, reject) => {
        request(url, function (err, response, body) {
            if (!err && response.statusCode == 200) {
                var $ = cheerio.load(body);

                item.name = $('h1').text();
                item.price = $('div.area_price > strong').text().split(/[^0-9]/).join('');
                // item.intro = $('.characteristics').html() + '\n' + $('.boxArticle').html();
                item.imgLinks = [];
                var gotoGallery = $('.owl-carousel > .item').first().attr('onclick');
                if (!gotoGallery) {
                    item.imgLinks.push($('.picture > img').attr('src'));
                } else {
                    var imageType = parseInt(gotoGallery.split(',')[0].split('').reverse().join());
                    var colorID = parseInt(gotoGallery.split(',')[1]);
                }

                var productId = $('#ProductId').val();
                item.productId = productId;
                (async() => {
                    item.info = await getFullSpec(item.productId);
                    item.imgLinks = item.imgLinks.length ? item.imgLinks : await getItemImages(item.productId, imageType, colorID);
                    return resolve(item);
                })();
            } else {
                return reject(err);
            }
        });
    })
}


getItemInfo('https://www.thegioididong.com/may-tinh-bang/ipad-pro-105-inch-wifi-cellular-64gb-2017').then(result => {
    fs.writeFile(result.productId + '.json', JSON.stringify(result), 'utf8', function (err) {
        if (err) {
            console.log("error: ", err);
        }
    })
}).catch(e => {
    console.error("Error: ", e);
})