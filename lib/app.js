"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const path = require("path");
const express = require("express");
const request = require("request");
const botbuilder_1 = require("botbuilder");
const sdk_1 = require("@conversationlearner/sdk");
const chalk_1 = require("chalk");
const config_1 = require("./config");
const BB = require("botbuilder");
//===================
// Create Bot server
//===================
const server = express();
const { bfAppId, bfAppPassword, modelId } = config_1.default, clOptions = __rest(config_1.default
//==================
// Create Adapter
//==================
, ["bfAppId", "bfAppPassword", "modelId"]);
//==================
// Create Adapter
//==================
const adapter = new botbuilder_1.BotFrameworkAdapter({ appId: bfAppId, appPassword: bfAppPassword });
//==================================
// Storage 
//==================================
// Initialize ConversationLearner using file storage.  
// Recommended only for development
// See "storageDemo.ts" for other storage options
let fileStorage = new sdk_1.FileStorage(path.join(__dirname, 'storage'));
//==================================
// Initialize Conversation Learner
//==================================
const sdkRouter = sdk_1.ConversationLearner.Init(clOptions, fileStorage);
const includeSdk = ['development', 'test'].includes(process.env.NODE_ENV || '');
if (includeSdk) {
    console.log(chalk_1.default.cyanBright(`Adding /sdk routes`));
    server.use('/sdk', sdkRouter);
}
const cl = new sdk_1.ConversationLearner(modelId);
class Cache {
    static Set(key, value) {
        this.cache[key] = value;
    }
    static Get(key) {
        return this.cache[key];
    }
}
Cache.cache = {};
exports.Cache = Cache;
function generateFilter(ingredient, category, type, glass) {
    let filter = "";
    let haveFirst = false;
    if (category) {
        filter += `${haveFirst ? '&' : ''}c=${category}`;
        haveFirst = true;
    }
    if (type) {
        filter += `${haveFirst ? '&' : ''}a=${type}`;
        haveFirst = true;
    }
    if (glass) {
        filter += `${haveFirst ? '&' : ''}g=${glass}`;
        haveFirst = true;
    }
    if (ingredient) {
        filter += `${haveFirst ? '&' : ''}i=${ingredient}`;
        haveFirst = true;
    }
    return filter;
}
exports.generateFilter = generateFilter;
function renderDrink(drink) {
    let facts = [];
    if (drink.strIngredient1) {
        facts.push({
            title: drink.strIngredient1,
            value: drink.strMeasure1
        });
    }
    if (drink.strIngredient2) {
        facts.push({
            title: drink.strIngredient2,
            value: drink.strMeasure2
        });
    }
    if (drink.strIngredient3) {
        facts.push({
            title: drink.strIngredient3,
            value: drink.strMeasure3
        });
    }
    if (drink.strIngredient4) {
        facts.push({
            title: drink.strIngredient4,
            value: drink.strMeasure4
        });
    }
    if (drink.strIngredient5) {
        facts.push({
            title: drink.strIngredient5,
            value: drink.strMeasure5
        });
    }
    let factSet = {
        type: "FactSet",
        facts: facts
    };
    let items = [];
    items.push({
        type: "TextBlock",
        text: drink.strDrink,
        weight: "bolder",
        size: "extraLarge",
        spacing: "none"
    });
    items.push({
        type: "TextBlock",
        text: drink.strGlass,
        size: "small",
        wrap: true
    });
    let column1 = {
        type: "Column",
        width: 1,
        items: items
    };
    let column2 = {
        type: "Column",
        width: 1,
        items: [
            {
                type: "Image",
                url: drink.strDrinkThumb
            }
        ]
    };
    let body = [];
    body.push({
        type: "ColumnSet",
        columns: [column1, column2]
    });
    body.push({
        type: "TextBlock",
        text: drink.strInstructions,
        size: "small",
        wrap: true
    });
    body.push(factSet);
    let actions = [];
    actions.push({
        type: "Action.Submit",
        title: "Make It!",
        data: { submit: "Make It" }
    });
    actions.push({
        type: "Action.Submit",
        title: "Something Else",
        data: { submit: "Something Else" }
    });
    let acard = {
        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
        type: "AdaptiveCard",
        version: "1.0",
        body: body,
        actions: actions
    };
    return acard;
}
exports.renderDrink = renderDrink;
function getcocktails(filter) {
    return new Promise((resolve, reject) => {
        const path = `http://www.thecocktaildb.com/api/json/v1/1/filter.php?${filter}`;
        let cachedValue = Cache.Get(path);
        if (cachedValue) {
            resolve(cachedValue);
            return;
        }
        request(path, function (error, response, body) {
            if (error) {
                console.error(error);
                reject(error);
            }
            else {
                if (body != "") {
                    let result = JSON.parse(body);
                    let cockIds = [];
                    for (let drink of result.drinks) {
                        cockIds.push(drink.idDrink);
                    }
                    Cache.Set(path, cockIds.slice());
                    resolve(cockIds);
                }
                else {
                    resolve([]);
                }
            }
        });
    });
}
exports.getcocktails = getcocktails;
function getCocktailByName(cocktail) {
    return new Promise((resolve, reject) => {
        const path = `http://www.thecocktaildb.com/api/json/v1/1/search.php?s=${cocktail}`;
        let cachedValue = Cache.Get(path);
        if (cachedValue) {
            resolve(cachedValue);
            return;
        }
        request(path, function (error, response, body) {
            if (error) {
                console.error(error);
                reject(error);
            }
            else {
                try {
                    if (body != "") {
                        let result = JSON.parse(body);
                        Cache.Set(path, result.drinks);
                        resolve(result.drinks);
                    }
                    else {
                        Cache.Set(path, []);
                        resolve([]);
                    }
                }
                catch (err) {
                    resolve([]);
                }
            }
        });
    });
}
exports.getCocktailByName = getCocktailByName;
function getCocktailById(cockId) {
    return new Promise((resolve, reject) => {
        const path = `http://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=${cockId}`;
        let cachedValue = Cache.Get(path);
        if (cachedValue) {
            resolve(cachedValue);
            return;
        }
        request(path, function (error, response, body) {
            if (error) {
                console.error(error);
                reject(error);
            }
            else {
                try {
                    if (body != "") {
                        let result = JSON.parse(body);
                        if (result && result.drinks) {
                            Cache.Set(path, result.drinks[0]);
                            resolve(result.drinks[0]);
                        }
                        else {
                            resolve(null);
                        }
                    }
                    else {
                        resolve(null);
                    }
                }
                catch (err) {
                    resolve(null);
                }
            }
        });
    });
}
exports.getCocktailById = getCocktailById;
function getRandomCocktail() {
    return new Promise((resolve, reject) => {
        const path = `https://www.thecocktaildb.com/api/json/v1/1/random.php`;
        request(path, function (error, response, body) {
            if (error) {
                console.error(error);
                reject(error);
            }
            else {
                try {
                    if (body != "") {
                        let result = JSON.parse(body);
                        if (result && result.drinks) {
                            resolve(result.drinks[0]);
                        }
                        else {
                            resolve(null);
                        }
                    }
                    else {
                        resolve(null);
                    }
                }
                catch (err) {
                    resolve(null);
                }
            }
        });
    });
}
exports.getRandomCocktail = getRandomCocktail;
let glassNames = [];
function getGlasses() {
    return new Promise((resolve, reject) => {
        if (glassNames.length > 0) {
            resolve(glassNames);
            return;
        }
        const path = `https://www.thecocktaildb.com/api/json/v1/1/list.php?g=list`;
        request(path, function (error, response, body) {
            if (error) {
                console.error(error);
                reject(error);
            }
            else {
                try {
                    let result = JSON.parse(body);
                    for (let glass of result.drinks) {
                        glassNames.push(glass.strGlass);
                    }
                    resolve(glassNames);
                }
                catch (err) {
                    resolve([]);
                }
            }
        });
    });
}
exports.getGlasses = getGlasses;
let categoryNames = [];
function getCategories() {
    return new Promise((resolve, reject) => {
        if (categoryNames.length > 0) {
            resolve(categoryNames);
            return;
        }
        const path = `https://www.thecocktaildb.com/api/json/v1/1/list.php?c=list`;
        request(path, function (error, response, body) {
            if (error) {
                console.error(error);
                reject(error);
            }
            else {
                try {
                    let result = JSON.parse(body);
                    for (let glass of result.drinks) {
                        categoryNames.push(glass.strCategory);
                    }
                    resolve(categoryNames);
                }
                catch (err) {
                    resolve([]);
                }
            }
        });
    });
}
exports.getCategories = getCategories;
let ingredientNames = [];
function getIngredients() {
    return new Promise((resolve, reject) => {
        if (ingredientNames.length > 0) {
            resolve(ingredientNames);
            return;
        }
        const path = `https://www.thecocktaildb.com/api/json/v1/1/list.php?i=list`;
        request(path, function (error, response, body) {
            if (error) {
                console.error(error);
                reject(error);
            }
            else {
                try {
                    let result = JSON.parse(body);
                    for (let glass of result.drinks) {
                        ingredientNames.push(glass.strIngredient1);
                    }
                    resolve(ingredientNames);
                }
                catch (err) {
                    resolve([]);
                }
            }
        });
    });
}
exports.getIngredients = getIngredients;
function GetSuggestions(cocktailIds, memoryManager) {
    return __awaiter(this, void 0, void 0, function* () {
        let chosenIngredients = memoryManager.EntityValueAsList("ingredients");
        let suggestions = [];
        for (let id of cocktailIds) {
            if (suggestions.length >= 5) {
                return suggestions;
            }
            let cocktail = yield getCocktailById(id);
            if (cocktail) {
                let existingIngredient = chosenIngredients.filter(i => (cocktail && i.toLowerCase() === cocktail.strIngredient1.toLowerCase()));
                let existingSuggestion = suggestions.filter(s => (cocktail && s.toLowerCase() === cocktail.strIngredient1.toLowerCase()));
                if (existingIngredient.length === 0 && existingSuggestion.length === 0) {
                    suggestions.push(cocktail.strIngredient1);
                }
                else {
                    let existingIngredient = chosenIngredients.filter(i => (cocktail && i.toLowerCase() === cocktail.strIngredient2.toLowerCase()));
                    let existingSuggestion = suggestions.filter(s => (cocktail && s.toLowerCase() === cocktail.strIngredient2.toLowerCase()));
                    if (existingIngredient.length === 0 && existingSuggestion.length === 0) {
                        suggestions.push(cocktail.strIngredient2);
                    }
                }
            }
        }
        return suggestions;
    });
}
exports.GetSuggestions = GetSuggestions;
function setCocktails(cocktailIds, memoryManager) {
    return __awaiter(this, void 0, void 0, function* () {
        memoryManager.ForgetEntity("noresults");
        memoryManager.RememberEntity("resultcount", cocktailIds.length);
        if (cocktailIds.length === 0) {
            memoryManager.RememberEntity("noresults", "true");
            memoryManager.ForgetEntity("cocktails");
            memoryManager.ForgetEntity("suggestions");
        }
        else if (cocktailIds.length > 5) {
            memoryManager.ForgetEntity("suggestions");
            let suggestions = yield GetSuggestions(cocktailIds, memoryManager);
            memoryManager.RememberEntities("suggestions", suggestions);
            memoryManager.ForgetEntity("noresults");
            memoryManager.RememberEntity("NeedRefine", "true");
            memoryManager.ForgetEntity("cocktails");
        }
        else {
            memoryManager.ForgetEntity("NeedRefine");
            memoryManager.ForgetEntity("noresults");
            memoryManager.ForgetEntity("suggestions");
            memoryManager.RememberEntities("cocktails", cocktailIds);
        }
    });
}
exports.setCocktails = setCocktails;
function Disambiguate(memoryManager, input, disambigInputs) {
    return __awaiter(this, void 0, void 0, function* () {
        let allIngredients = yield getIngredients();
        let allCategories = yield getCategories();
        let allGlasses = yield getGlasses();
        // Look for exact match (i.e. plain "Vodka" in list of many vodka types)
        let refined = disambigInputs.filter(n => n.toLowerCase() == input);
        if (refined.length == 0) {
            // Then look for sub-matches ('i.e. "Cranderry" in "Cranberry Vodka")
            refined = disambigInputs.filter(n => n.toLowerCase().includes(input));
        }
        // If I've refined down to one item, set it
        if (refined.length === 1) {
            input = refined[0].toLowerCase();
            if (allIngredients.find(n => n.toLowerCase() === input)) {
                memoryManager.RememberEntity("ingredients", input);
                disambigInputs = [];
                return true;
            }
            else if (allCategories.find(n => n.toLowerCase() === input)) {
                memoryManager.RememberEntity("category", input);
                disambigInputs = [];
                return true;
            }
            else if (allGlasses.find(n => n.toLowerCase() === input)) {
                memoryManager.RememberEntity("glass", input);
                disambigInputs = [];
                return true;
            }
            else {
                let cocktails = yield getCocktailByName(input);
                if (cocktails.length == 1) {
                    yield setCocktails([cocktails[0].idDrink], memoryManager);
                    disambigInputs = [];
                    return true;
                }
            }
        }
        else if (refined.length > 1) {
            memoryManager.RememberEntity("DisambigItem", input);
            memoryManager.RememberEntities("DisambigInputs", refined);
            disambigInputs = [];
            return false;
        }
        return false;
    });
}
function Reset(memoryManager) {
    return __awaiter(this, void 0, void 0, function* () {
        memoryManager.ForgetEntity("cocktails");
        memoryManager.ForgetEntity("resultcount");
        memoryManager.ForgetEntity("NeedRefine");
        memoryManager.ForgetEntity("category");
        memoryManager.ForgetEntity("glass");
        memoryManager.ForgetEntity("type");
        memoryManager.ForgetEntity("ingredients");
        memoryManager.ForgetEntity("noresults");
        memoryManager.ForgetEntity("suggestions");
    });
}
exports.Reset = Reset;
cl.AddCallback({
    name: "ShowGlasses",
    render: (memoryManager) => __awaiter(this, void 0, void 0, function* () {
        let glasses = yield getGlasses();
        return glasses.join(", ");
    })
});
cl.AddCallback({
    name: "ClearSearch",
    logic: (memoryManager) => __awaiter(this, void 0, void 0, function* () {
        yield Reset(memoryManager);
    })
});
cl.AddCallback({
    name: "ShowCategories",
    render: (memoryManager) => __awaiter(this, void 0, void 0, function* () {
        let categories = yield getCategories();
        return categories.join(", ");
    })
});
cl.AddCallback({
    name: "ShowIngredients",
    render: (memoryManager) => __awaiter(this, void 0, void 0, function* () {
        let ingredients = yield getIngredients();
        return ingredients.join(", ");
    })
});
cl.AddCallback({
    name: "GetCocktails",
    logic: (memoryManager) => __awaiter(this, void 0, void 0, function* () {
        let ingredients = memoryManager.EntityValueAsList("ingredients");
        let category = memoryManager.EntityValue("category");
        let glass = memoryManager.EntityValue("glass");
        let type = memoryManager.EntityValue("type");
        // Filter does an OR not an AND so have to do it ourselves
        let filterResults = [];
        let allIds = [];
        for (let ingredient of ingredients) {
            let filter = generateFilter(ingredient, null, null, null);
            let cocktailIds = yield getcocktails(filter);
            filterResults.push(cocktailIds);
            allIds = allIds.concat(cocktailIds);
        }
        if (category) {
            let filter = generateFilter(null, category, null, null);
            let cocktailIds = yield getcocktails(filter);
            filterResults.push(cocktailIds);
            allIds = allIds.concat(cocktailIds);
        }
        if (type) {
            let filter = generateFilter(null, null, type, null);
            let cocktailIds = yield getcocktails(filter);
            filterResults.push(cocktailIds);
            allIds = allIds.concat(cocktailIds);
        }
        if (glass) {
            let filter = generateFilter(null, null, null, glass);
            let cocktailIds = yield getcocktails(filter);
            filterResults.push(cocktailIds);
            allIds = allIds.concat(cocktailIds);
        }
        // If there's only one filter just return it
        if (filterResults.length === 1) {
            yield setCocktails(allIds, memoryManager);
            return;
        }
        // Get set of all cocktail ideas
        allIds = [...new Set(allIds)];
        // Now get ones shared across all ingredients
        let winners = [];
        for (let id of allIds) {
            let isWinner = true;
            let count = 0;
            filterResults.forEach(f => count += (f.indexOf(id) > -1) ? 1 : 0);
            if (count === filterResults.length) {
                winners.push(id);
            }
        }
        yield setCocktails(winners, memoryManager);
    })
});
cl.AddCallback({
    name: "Suggest",
    render: (memoryManager) => __awaiter(this, void 0, void 0, function* () {
        memoryManager.ForgetEntity("recommend");
        // If I have things to disambiguate pick one
        let disambigInputs = memoryManager.EntityValueAsList("DisambigInputs");
        if (disambigInputs.length > 0) {
            let choice = Math.floor(Math.random() * disambigInputs.length);
            memoryManager.RememberEntity("input", disambigInputs[choice]);
            return `I suggest ${disambigInputs[choice]}`;
        }
        // If I have things to suggest pick one
        let suggestions = memoryManager.EntityValueAsList("suggestions");
        if (suggestions.length > 0) {
            let choice = Math.floor(Math.random() * suggestions.length);
            memoryManager.ForgetEntity("suggestions");
            memoryManager.RememberEntity("input", suggestions[choice]);
            return `I suggest ${suggestions[choice]}`;
        }
        // Otherwise show a random cocktail
        let cocktail = yield getRandomCocktail();
        if (cocktail) {
            memoryManager.ForgetEntity("cocktails");
            memoryManager.RememberEntity("cocktails", cocktail.idDrink);
            return "How about this...";
        }
        return "I'm confused.";
    })
});
cl.AddCallback({
    name: "ShowCocktails",
    render: (memoryManager) => __awaiter(this, void 0, void 0, function* () {
        let cocktails = memoryManager.EntityValueAsList("cocktails");
        let attachments = [];
        for (let id of cocktails) {
            let cocktail = yield getCocktailById(id);
            if (cocktail) {
                let card = renderDrink(cocktail);
                attachments.push(BB.CardFactory.adaptiveCard(card));
            }
        }
        const message = BB.MessageFactory.list(attachments);
        message.text = undefined;
        message.attachmentLayout = "carousel";
        yield Reset(memoryManager);
        return message;
    })
});
cl.EntityDetectionCallback((text, memoryManager) => __awaiter(this, void 0, void 0, function* () {
    // Get disambig inputs
    let disambigInputs = memoryManager.EntityValueAsList("DisambigInputs");
    let suggestions = memoryManager.EntityValueAsList("suggestions");
    let unknownInput = memoryManager.EntityValue("UnknownInput");
    let recommend = memoryManager.EntityValue("recommend");
    // Clear uknown
    memoryManager.ForgetEntity("UnknownInput");
    // Clear disambig only if last result wasn't unknown or something was recommended
    if (!unknownInput && !recommend) {
        memoryManager.ForgetEntity("DisambigInputs");
        memoryManager.ForgetEntity("DisambigItem");
    }
    let chosenIngredients = memoryManager.EntityValueAsList("ingredients");
    let chosenGlass = memoryManager.EntityValue("glass");
    let chosenCategory = memoryManager.EntityValue("category");
    // First handle removals
    var removes = memoryManager.EntityValueAsList("removeInput");
    for (let remove of removes) {
        remove = remove.toLowerCase();
        if (chosenIngredients.length > 0) {
            let newIgredients = chosenIngredients.filter(i => i.toLocaleLowerCase() !== remove);
            if (newIgredients.length != chosenIngredients.length) {
                memoryManager.RememberEntities("ingredients", newIgredients);
            }
        }
        if (chosenGlass === remove) {
            memoryManager.ForgetEntity("glass");
        }
        if (chosenCategory === remove) {
            memoryManager.ForgetEntity("category");
        }
    }
    // Get list of (possibly) ambiguous apps
    var inputs = memoryManager.EntityValueAsList("input");
    if (inputs.length > 0) {
        // If I have new inputs, clear my last search results
        memoryManager.ForgetEntity("NeedRefine");
        memoryManager.ForgetEntity("cocktails");
        memoryManager.ForgetEntity("resultcount");
        memoryManager.ForgetEntity("noresults");
        // Process the most recent input first
        inputs = inputs.reverse();
        let allIngredients = yield getIngredients();
        let allCategories = yield getCategories();
        let allGlasses = yield getGlasses();
        for (let input of inputs) {
            input = input.toLowerCase();
            let handled = false;
            memoryManager.ForgetEntity("input", input);
            // If resolved ingore it
            if (chosenIngredients.filter(i => i.toLowerCase() === input).length > 0) {
                handled = true;
            }
            if (chosenGlass === input) {
                handled = true;
            }
            if (chosenCategory === input) {
                handled = true;
            }
            // First check if user disambiguated an input
            if (!handled && disambigInputs.length > 0) {
                handled = yield Disambiguate(memoryManager, input, disambigInputs);
            }
            if (!handled && suggestions.length > 0) {
                handled = yield Disambiguate(memoryManager, input, suggestions);
            }
            // If not handles, attempt to look it up
            if (!handled) {
                let foundIngredients = allIngredients.filter(n => n.toLowerCase().includes(input));
                let foundCategories = allCategories.filter(n => n.toLowerCase().includes(input));
                let foundGlasses = allGlasses.filter(n => n.toLowerCase().includes(input));
                // Only look for cocktails by name if I have no other search criteria
                let foundCocktails = [];
                let cocktails = [];
                if (chosenIngredients.length === 0 && chosenGlass === null && chosenCategory === null && inputs.length == 1) {
                    cocktails = yield getCocktailByName(input);
                    foundCocktails = cocktails && cocktails.length > 0 ?
                        cocktails.map(idrink => idrink.strDrink) : [];
                }
                let foundCount = foundIngredients.length + foundCategories.length + foundGlasses.length + foundCocktails.length;
                if (foundCount == 0) {
                    memoryManager.RememberEntity("UnknownInput", input);
                    break;
                }
                else if (foundCount > 1) {
                    let choices = foundIngredients.concat(foundCategories, foundGlasses, foundCocktails);
                    memoryManager.RememberEntity("DisambigItem", input);
                    memoryManager.RememberEntities("DisambigInputs", choices);
                    break;
                }
                else if (foundIngredients.length == 1) {
                    memoryManager.RememberEntity("ingredients", input);
                }
                else if (foundCategories.length == 1) {
                    memoryManager.RememberEntity("category", input);
                }
                else if (foundGlasses.length == 1) {
                    memoryManager.RememberEntity("glass", input);
                }
                else if (foundCocktails.length == 1) {
                    memoryManager.RememberEntity("cocktails", cocktails[0].idDrink);
                }
            }
        }
    }
}));
//=================================
// Handle Incoming Messages
//=================================
server.post('/api/messages', (req, res) => {
    try {
        adapter.processActivity(req, res, (context) => __awaiter(this, void 0, void 0, function* () {
            let result = yield cl.recognize(context);
            if (result) {
                cl.SendResult(result);
            }
        }));
    }
    catch (error) {
        console.log(JSON.stringify(error));
    }
});
//# sourceMappingURL=app.js.map