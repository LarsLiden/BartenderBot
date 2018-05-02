/**
 * Copyright (c) Microsoft Corporation. All rights reserved.  
 * Licensed under the MIT License.
 */
import * as path from 'path'
import * as restify from 'restify'
import * as BB from 'botbuilder'
import * as request from 'request'
import { BotFrameworkAdapter } from 'botbuilder'
import { ConversationLearner, ClientMemoryManager, models, FileStorage } from 'conversationlearner-sdk'
import config from './config'
import { v1String } from 'uuid/interfaces';

//===================
// Create Bot server
//===================
const server = restify.createServer({
    name: 'BOT Server'
});

console.log(`BotPort: ${config.botPort}`)

server.listen(config.botPort, () => {
    console.log(`${server.name} listening to ${server.url}`);
});

const { bfAppId, bfAppPassword, clAppId, ...clOptions } = config

//==================
// Create Adapter
//==================
const adapter = new BotFrameworkAdapter({ appId: bfAppId, appPassword: bfAppPassword });


//==================================
// Storage 
//==================================
// Initialize ConversationLearner using file storage.  
// Recommended only for development
// See "storageDemo.ts" for other storage options
let fileStorage = new FileStorage(path.join(__dirname, 'storage'))

//==================================
// Initialize Conversation Learner
//==================================
ConversationLearner.Init(clOptions, fileStorage);
let cl = new ConversationLearner(clAppId);

//=========================================================
// Bots Buisness Logic
//=========================================================
let cities = ['new york', 'boston', 'new orleans'];
let cityMap:{ [index:string] : string } = {};
cityMap['big apple'] = 'new york';
cityMap['windy city'] = 'chicago';

var resolveCity = function(cityFromUser: string) {
    if (cities.indexOf(cityFromUser) > -1) {
        return cityFromUser;
    } else if (cityFromUser in cityMap) {
        return cityMap[cityFromUser];
    } else {
        return null;
    }
}

//===============================
// Cocktail 
//===============================
export interface ICocktail {
    id:string
    title: string,
    instructions: string,
    ingredients: string[],
    image: string
}

export interface IDrinks {
    drinks : IDrink[]
}

export interface IDrink {
    strDrink:string
    strDrinkThumb: string,
    idDrink: string,
    strGlass: string,
    strInstructions: string,
    strIngredient1: string,
    strIngredient2: string,
    strIngredient3: string,
    strIngredient4: string,
    strIngredient5: string,
    strIngredient6: string,
    strIngredient7: string,
    strIngredient8: string,
    strIngredient9: string,
    strIngredient10: string,
    strMeasure1: string,
    strMeasure2: string,
    strMeasure3: string,
    strMeasure4: string,
    strMeasure5: string,
    strMeasuret6: string,
    strMeasure7: string,
    strMeasure8: string,
    strMeasure9: string,
    strMeasure10: string,
}

let cache: {[key: string]: any} = {};

export function generateFilter(ingredient: string, category: string | null, type: string | null, glass: string | null): string {
    let filter = ""; 
    let haveFirst = false;

    if (category) {
        filter += `${haveFirst ? '&' : ''}c=${category}`
        haveFirst = true;
    }
    if (type) {
        filter += `${haveFirst ? '&' : ''}a=${type}`
        haveFirst = true;
    }
    if (type) {
        filter += `${haveFirst ? '&' : ''}g=${glass}`
        haveFirst = true;
    }
    if (ingredient) {
        filter += `${haveFirst ? '&' : ''}i=${ingredient}`
        haveFirst = true;
    }
    return filter;
}

export function renderDrink(drink: IDrink) {

    let facts = [];
    if (drink.strIngredient1) {
        facts.push({
            title: drink.strIngredient1,
            value: drink.strMeasure1
        })
    }
    if (drink.strIngredient2) {
        facts.push({
            title: drink.strIngredient2,
            value: drink.strMeasure2
        })
    }
    if (drink.strIngredient3) {
        facts.push({
            title: drink.strIngredient3,
            value: drink.strMeasure3
        })
    }
    if (drink.strIngredient4) {
        facts.push({
            title: drink.strIngredient4,
            value: drink.strMeasure4
        })
    }
    if (drink.strIngredient5) {
        facts.push({
            title: drink.strIngredient5,
            value: drink.strMeasure5
        })
    }
    let factSet = {
        type: "FactSet",
        facts: facts
    }

    let items = [];
    items.push(
        {
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
    })

    let column1 = {
        type: "Column",
        width: 1,
        items: items
    }

    let column2 = {
        type: "Column",
        width: 1,
        items: [
            {
                type: "Image",
                url: drink.strDrinkThumb
            }
        ]
    }

    let body = [];
    body.push({
        type: "ColumnSet",
        columns: [column1, column2]
    })
    body.push({
        type: "TextBlock",
        text: drink.strInstructions,
        size: "small",
        wrap: true
    })
    body.push(factSet)

    let actions = [];
    actions.push({
        type: "Action.Submit",
        title: "Make It!",
        data: { submit: "Make It" }
    })
    actions.push({
        type: "Action.Submit",
        title: "Something Else",
        data: { submit: "Something Else" }
    })

    let acard = {
        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
        type: "AdaptiveCard",
        version: "1.0",
        body: body,
        actions: actions
    }
    return acard;
}

export function getcocktails(filter: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
        const path = `http://www.thecocktaildb.com/api/json/v1/1/filter.php?${filter}`;
        if (cache[path]) {
            resolve(cache[path]);
            return;
        }
        request(path, function (error, response, body) {

            if (error) {
                console.error(error);
                reject(error);
            }
            else {
                if (body != "") {
                    let result = JSON.parse(body) as IDrinks;
                    let cockIds = [];
                    for (let drink of result.drinks) {
                        cockIds.push(drink.idDrink)
                    }
                    resolve(cockIds)
                    cache[path] = cockIds;
                }
                else {
                    resolve([]);
                }
            }
        });
    });
}

export function getCocktailByName(cocktail: string): Promise<IDrink[]> {
    return new Promise((resolve, reject) => {
        const path = `http://www.thecocktaildb.com/api/json/v1/1/search.php?s=${cocktail}`;
        if (cache[path]) {
            resolve(cache[path]);
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
                        let result = JSON.parse(body) as IDrinks;
                        resolve(result.drinks)
                        cache[path] = result.drinks
                    }
                    else {
                        resolve([]);
                        cache[path] = [];
                    }
                }
                catch (err) {
                    resolve([])
                }
            }
        });
    });
}

export function getCocktailById(cockId: string): Promise<IDrink | null> {
    return new Promise((resolve, reject) => {
        const path = `http://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=${cockId}`;
        if (cache[path]) {
            resolve(cache[path]);
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
                        let result = JSON.parse(body) as IDrinks;
                        if (result && result.drinks) {
                            resolve(result.drinks[0])
                            cache[path]=result.drinks[0];
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
                    resolve(null)
                }
            }
        });
    });
}

let glassNames: string[] = [];
export function getGlasses(): Promise<string[]> {
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
                    resolve(glassNames)
                } 
                catch (err) {
                    resolve([])
                }
            }
        });
    });
}

cl.AddAPICallback("ShowGlasses", async (memoryManager: ClientMemoryManager) => {
    let glasses = await getGlasses();
    return glasses.join(", ");
})

cl.AddAPICallback("ClearSearch", async (memoryManager: ClientMemoryManager) => {
    await memoryManager.ForgetEntityAsync("cocktails");
    await memoryManager.ForgetEntityAsync("resultcount");
    await memoryManager.ForgetEntityAsync("NeedRefine");
    await memoryManager.ForgetEntityAsync("category");
    await memoryManager.ForgetEntityAsync("glass");
    await memoryManager.ForgetEntityAsync("type");
    await memoryManager.ForgetEntityAsync("ingredients");
})

let categoryNames: string[] = [];
export function getCategories(): Promise<string[]> {
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
                    resolve(categoryNames)
                }
                catch (err) {
                    resolve([])
                }
            }
        });
    });
}

cl.AddAPICallback("ShowCategories", async (memoryManager: ClientMemoryManager) => {
    let categories = await getCategories();
    return categories.join(", ");
})

let ingredientNames: string[] = [];
export function getIngredients(): Promise<string[]> {
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
            else 
            {
                try {
                    let result = JSON.parse(body);
                    for (let glass of result.drinks) {
                        ingredientNames.push(glass.strIngredient1);
                    }
                    resolve(ingredientNames)
                }
                catch (err) {
                    resolve([])
                }
            }
        });
    });
}

cl.AddAPICallback("ShowIngredients", async (memoryManager: ClientMemoryManager) => {
    let ingredients = await getIngredients();
    return ingredients.join(", ");
})

export async function setCocktails(cocktailIds: string[], memoryManager: ClientMemoryManager) {
    await memoryManager.RememberEntityAsync("resultcount", cocktailIds.length);

    if (cocktailIds.length > 5) {
        await memoryManager.RememberEntityAsync("NeedRefine", "true");
        await memoryManager.ForgetEntityAsync("cocktails");
    }
    else {
        await memoryManager.ForgetEntityAsync("NeedRefine")
        await memoryManager.RememberEntitiesAsync("cocktails", cocktailIds);
    }
}

cl.AddAPICallback("GetCocktails", async (memoryManager: ClientMemoryManager) => {

    let ingredients = await memoryManager.EntityValueAsListAsync("ingredients");
    let category = await memoryManager.EntityValueAsync("category");
    let glass = await memoryManager.EntityValueAsync("glass");
    let type = await memoryManager.EntityValueAsync("type");

    // Filter does an OR not an AND on ingrediants, so have to do it ourselves
    if (ingredients.length > 1) {
        let filterResults = [];
        let allIds: string[] = [];
        for (let ingredient of ingredients) {
            let filter = generateFilter(ingredient, category, type, glass);
            let cocktailIds = await getcocktails(filter);
            filterResults.push(cocktailIds);
            allIds = allIds.concat(cocktailIds);
        }

        // Get set of all cocktail ideas
        allIds = [... new Set(allIds)];

        // Now get ones shared across all ingredients
        let winners = [];
        for (let id of allIds) {
            let isWinner = true;
            let count = 0;
            filterResults.forEach(f => count += (f.indexOf(id)+1))
            if (count === ingredients.length)
            {
                winners.push(id);
            }
        }
        await setCocktails(winners, memoryManager);
    }
    else {
        let filter = generateFilter(ingredients[0], category, type, glass);
        let cocktailIds = await getcocktails(filter);
        await setCocktails(cocktailIds, memoryManager);
    }
})

cl.AddAPICallback("ShowCocktails", async (memoryManager: ClientMemoryManager) => {

    let cocktails = await memoryManager.EntityValueAsListAsync("cocktails")

    let attachments = []

    for (let id of cocktails) {
        let cocktail = await getCocktailById(id)
        if (cocktail) {
            let card = renderDrink(cocktail);
            attachments.push(BB.CardFactory.adaptiveCard(card))
        }
    }

    const message = BB.MessageFactory.list(attachments)
    message.text = undefined
    message.attachmentLayout = "carousel"
    return message
})

export async function processInput(memoryManager: ClientMemoryManager) {

 
}
cl.EntityDetectionCallback(async (text: string, memoryManager: ClientMemoryManager): Promise<void> => {
    // Get disambig inputs
    let disambigInputs = await memoryManager.EntityValueAsListAsync("DisambigInputs")
    let unknownInput = await memoryManager.EntityValueAsync("UnknownInput")

    // Clear uknown
    await memoryManager.ForgetEntityAsync("UnknownInput");

    // Clear disambig only if last result wasn't uknown
    if (!unknownInput) {
        await memoryManager.ForgetEntityAsync("DisambigInputs");
    }
            
    // Get list of (possibly) ambiguous apps
    var inputs = await memoryManager.EntityValueAsListAsync("input");
    
    if (inputs.length > 0) {
        // If I have new inputs, clear my last search results
        await memoryManager.ForgetEntityAsync("NeedRefine");
        await memoryManager.ForgetEntityAsync("cocktails");
        await memoryManager.ForgetEntityAsync("resultcount");
    
        // Process the most recent input first
        inputs = inputs.reverse();

        let ingredients = await getIngredients();
        let categories = await getCategories();
        let glasses = await getGlasses();

        for (let input of inputs) {
            input = input.toLowerCase()
            let handled = false;
            await memoryManager.ForgetEntityAsync("input", input);

            // First check if user disambiguated an input
            if (disambigInputs.length > 0) {
                // Look for exact match (i.e. plain "Vodka" in list of many vodka types)
                let refined = disambigInputs.filter(n => n.toLowerCase() == input);
                if (refined.length == 0) {
                    // Then look for sub-matches ('i.e. "Cranderry" in "Cranberry Vodka")
                    refined = disambigInputs.filter(n => n.toLowerCase().includes(input));
                }

                // If I've refined down to one item, set it
                if (refined.length === 1) {
                    input = refined[0].toLowerCase();
                    if (ingredients.find(n => n.toLowerCase() === input)) {
                        await memoryManager.RememberEntityAsync("ingredients", input);
                        disambigInputs = [];
                        handled = true;
                    }
                    else if (categories.find(n => n.toLowerCase() === input)) {
                        await memoryManager.RememberEntityAsync("category", input);
                        disambigInputs = [];
                        handled = true;
                    }
                    else if (glasses.find(n => n.toLowerCase() === input)) {
                        await memoryManager.RememberEntityAsync("glass", input);
                        disambigInputs = [];
                        handled = true;
                    }
                    else {
                        let cocktails = await getCocktailByName(input);
                        if (cocktails.length == 1) {
                            await setCocktails([cocktails[0].idDrink], memoryManager);
                            disambigInputs = [];
                            handled = true;
                        }
                    }
                }
                else if (refined.length > 1) {
                    await memoryManager.RememberEntitiesAsync("DisambigInputs", refined);
                    disambigInputs = [];
                    handled = true;
                }
            }
            if (!handled) {
                let foundIngredients = ingredients.filter(n => n.toLowerCase().includes(input));
                let foundCategories = categories.filter(n => n.toLowerCase().includes(input));
                let foundGlasses = glasses.filter(n => n.toLowerCase().includes(input));

                let cocktails = await getCocktailByName(input);
                let foundCocktails = cocktails && cocktails.length > 0 ? 
                    cocktails.map(idrink => idrink.strDrink) : [];

                let foundCount = foundIngredients.length + foundCategories.length + foundGlasses.length + foundCocktails.length;
                if (foundCount == 0) {
                    await memoryManager.RememberEntityAsync("UnknownInput", input);
                    break;
                }
                else if (foundCount > 1) {
                    let choices = foundIngredients.concat(foundCategories, foundGlasses, foundCocktails)
                    await memoryManager.RememberEntitiesAsync("DisambigInputs", choices);
                    break;
                }
                else if (foundIngredients.length == 1) {
                    await memoryManager.RememberEntityAsync("ingredients", input);
                }
                else if (foundCategories.length == 1) {
                    await memoryManager.RememberEntityAsync("category", input);
                }
                else if (foundGlasses.length == 1) {
                    await memoryManager.RememberEntityAsync("glass", input);
                }
            }
        }
    }
})

//=================================
// Handle Incoming Messages
//=================================

server.post('/api/messages', (req, res) => {
    adapter.processActivity(req, res, async context => {
        let result = await cl.recognize(context)
        
        if (result) {
            cl.SendResult(result);
        }
    })
})
