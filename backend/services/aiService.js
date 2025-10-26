const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

class AIService {
    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.warn('GEMINI_API_KEY is not set. AI features will return fallback responses.');
            this.model = null;
            return;
        }
        this.genAI = new GoogleGenerativeAI(apiKey);
        // Prefer a widely available model; fall back to legacy if needed
        const preferredModels = [
            process.env.GEMINI_MODEL, // allow override
            'gemini-2.5-flash', // user's available model
            'gemini-2.5-pro', // another 2.5 variant
            'gemini-1.5-flash-8b',
            'gemini-1.5-flash-latest',
            'gemini-1.5-flash-001',
            'gemini-pro' // legacy fallback
        ].filter(Boolean);
        let initialized = false;
        for (const name of preferredModels) {
            try {
                this.model = this.genAI.getGenerativeModel({ model: name });
                console.log(`[AI] Gemini model initialized: ${name}`);
                initialized = true;
                break;
            } catch (e) {
                console.warn(`[AI] Failed to init model ${name}:`, (e && e.message) ? e.message : e);
            }
        }
        if (!initialized) {
            console.warn('[AI] No Gemini model initialized; AI will use local fallback.');
            this.model = null;
        }
    }

    async getDrinkRecommendations(dietaryPreferences, customerHistory = [], currentMenu = []) {
            try {
                if (!this.model) throw new Error('Model not initialized');
                // Build menu context
                const menuContext = currentMenu.length > 0 ?
                    `Current available menu: ${currentMenu.map(item => `${item.name} (${item.category}) - ₱${item.price}`).join(', ')}`
            : 'Standard coffee shop menu';
            
            const prompt = `
            As a coffee shop AI assistant, recommend drinks based on the following criteria:
            
            Dietary Preferences: ${JSON.stringify(dietaryPreferences)}
            Customer History: ${JSON.stringify(customerHistory)}
            ${menuContext}
            
            IMPORTANT: Only recommend drinks that are actually available in the current menu.
            Focus on real menu items, not generic suggestions.
            
            Available Customizations:
            - Milk alternatives: Almond, Oat, Soy
            - Syrups: Caramel, Vanilla, Chocolate
            - Toppings: Whipped Cream
            - Spices: Cinnamon, Nutmeg
            - Extra shots
            
            Please provide:
            1. 3 personalized drink recommendations with explanations (use actual menu items)
            2. Customization suggestions for each recommendation
            3. Dietary considerations for each option
            4. Price range estimates based on actual menu prices
            
            Format your response as JSON with the following structure:
            {
                "recommendations": [
                    {
                        "name": "Drink Name",
                        "baseDrink": "Base drink",
                        "customizations": ["customization1", "customization2"],
                        "explanation": "Why this drink is recommended",
                        "dietaryNotes": "Dietary considerations",
                        "estimatedPrice": "Price range",
                        "preparationTime": "Estimated time"
                    }
                ],
                "generalTips": "General customization tips"
            }
            `;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            try {
                return JSON.parse(text);
            } catch (_err) {
                return {
                    recommendations: [{
                        name: 'Custom Recommendation',
                        baseDrink: 'Based on your preferences',
                        customizations: ['Personalized options'],
                        explanation: text,
                        dietaryNotes: 'Consider your dietary preferences',
                        estimatedPrice: '₱4-6',
                        preparationTime: '3-5 minutes'
                    }],
                    generalTips: 'Ask our baristas for more customization options'
                };
            }
        } catch (error) {
            console.error('AI recommendation error:', error.message);
            return {
                recommendations: [{
                    name: 'Classic Latte',
                    baseDrink: 'Latte',
                    customizations: ['Choose your milk preference'],
                    explanation: 'A classic choice that is highly customizable',
                    dietaryNotes: 'Can be made with alternative milks',
                    estimatedPrice: '₱4-5',
                    preparationTime: '4 minutes'
                }],
                generalTips: 'Our baristas can help you customize any drink to your preferences'
            };
        }
    }

    async getCustomizationSuggestions(baseDrink, dietaryPreferences, currentMenu = [], availableIngredients = []) {
        try {
            if (!this.model) throw new Error('Model not initialized');
            const availableCustomizations = availableIngredients.map(ing => ing.name).join(', ');
            const menuContext = currentMenu.length > 0 
                ? `Current menu includes: ${currentMenu.map(item => `${item.name} (${item.category})`).join(', ')}`
                : 'Standard coffee shop menu';
            
            const prompt = `
            Suggest customizations for a ${baseDrink} based on these dietary preferences: ${JSON.stringify(dietaryPreferences)}
            
            ${menuContext}
            
            Available customizations from inventory: ${availableCustomizations}
            
            Consider:
            - Dietary restrictions
            - Flavor preferences
            - Health considerations
            - Popular combinations
            - What's actually available in the current menu
            - Seasonal or trending items
            
            Return as JSON:
            {
                "suggestions": [
                    {
                        "name": "Customization name",
                        "description": "What it adds",
                        "price": "Additional cost",
                        "dietaryNotes": "Dietary considerations"
                    }
                ],
                "combinations": [
                    {
                        "name": "Combination name",
                        "customizations": ["customization1", "customization2"],
                        "description": "Why this combination works well",
                        "totalPrice": "Total additional cost"
                    }
                ]
            }
            `;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            try {
                return JSON.parse(text);
            } catch (_err) {
                return {
                    suggestions: [{
                        name: 'Alternative Milk',
                        description: 'Choose almond, oat, or soy milk',
                        price: '₱0.75',
                        dietaryNotes: 'Lactose-free options available'
                    }],
                    combinations: [{
                        name: 'Classic Sweet',
                        customizations: ['Vanilla Syrup', 'Whipped Cream'],
                        description: 'A sweet and creamy combination',
                        totalPrice: '₱1.25'
                    }]
                };
            }
        } catch (error) {
            console.error('AI customization error:', error.message);
            return { suggestions: [], combinations: [] };
        }
    }

    async chatWithCustomer(message, sessionHistory = [], dietaryPreferences = {}, currentMenu = []) {
        try {
            if (!this.model) {
                return this._localChatFallback(message, currentMenu);
            }
            // Build concise menu context for grounding. Only include name, category and price.
            const menuSnapshot = Array.isArray(currentMenu) && currentMenu.length > 0
                ? currentMenu.map(i => `${i.name} (${i.category})`).join(', ')
                : 'No menu provided';

            const context = `
            You are a helpful coffee shop AI assistant. You help customers with:
            - Drink recommendations
            - Customization suggestions
            - Dietary advice
            - General coffee knowledge
            
            Customer's dietary preferences: ${JSON.stringify(dietaryPreferences)}
            
            Previous conversation: ${JSON.stringify(sessionHistory)}
            
            Current message: ${message}
            
            IMPORTANT GROUNDING RULES:
            - Recommend ONLY items that exist in OUR CURRENT MENU provided below.
            - Use exact item names from the menu list when recommending.
            - Do NOT disclose exact prices in replies under any circumstance.
            - If the user asks for something not on the menu, suggest the closest available alternatives from the menu.
            - Keep responses concise and helpful (2-4 sentences unless more detail is requested).
            - If the user's message is a greeting or small talk (e.g., "hi", "hello", "hey", "good morning", "good afternoon", "good evening"), reply courteously WITHOUT mentioning the menu or recommendations. Only discuss the menu when the user asks about drinks, menu, recommend, suggest, customize, price, or similar intent.
            - If the user asks for price information, DO NOT provide numbers. Say: "Please visit the Menu to view current prices." Keep it brief and helpful.

            CURRENT MENU (name, category, price): ${menuSnapshot}

            Be friendly, helpful, and knowledgeable about coffee. Keep responses concise but informative.
            If asked about specific drinks, mention customization options and dietary considerations.
            `;

            const result = await this.model.generateContent(context);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error('AI chat error:', error.message);
            return this._localChatFallback(message, currentMenu);
        }
    }

    _localChatFallback(message, currentMenu = []) {
        const text = String(message || '').toLowerCase();
        const greet = ['hi','hello','hey','good morning','good afternoon','good evening'];
        if (greet.some(g => text.includes(g))) {
            return "Hi there! I’m CaféIQ. I can help with drink recommendations, customizations, and menu questions. What are you in the mood for?";
        }

        // Handle creamy/milk intent
        if (text.includes('creamy') || text.includes('creamier') || text.includes('milk')) {
            // Try to detect possible milk options from menu context (very light heuristic)
            const items = Array.isArray(currentMenu) ? currentMenu : [];
            const availableNames = items.map(i => i.name.toLowerCase()).join(' ');
            const options = [];
            if (availableNames.includes('almond')) options.push('almond milk');
            if (availableNames.includes('oat')) options.push('oat milk');
            if (availableNames.includes('soy')) options.push('soy milk');
            // Always include common dairy options
            options.push('whole milk', 'skim milk');
            const uniqueOptions = Array.from(new Set(options));
            return `To make it creamy, we can add milk. Popular options are ${uniqueOptions.slice(0,5).join(', ')}. Which milk do you prefer?`;
        }

        const askRecommend = text.includes('recommend') || text.includes('suggest');
        const askMenu = text.includes('menu') || text.includes('what do you have');
        const items = Array.isArray(currentMenu) ? currentMenu : [];
        const askPrice = text.includes('price') || text.includes('how much') || text.includes('cost');
        if ((askRecommend || askMenu) && items.length > 0) {
            const names = items.slice(0, 3).map(i => i.name).join(', ');
            return `Here are some popular picks: ${names}. Would you like me to suggest customizations?`;
        }
        if (askPrice) {
            return `Please visit the Menu to view current prices.`;
        }
        return "I’m here to help with drinks, customizations, and menu questions. Ask me for recommendations or customization tips!";
    }

    async analyzeOrderForDietaryCompliance(orderItems, dietaryPreferences) {
        try {
            if (!this.model) throw new Error('Model not initialized');
            const prompt = `
            Analyze this order for dietary compliance:
            
            Order: ${JSON.stringify(orderItems)}
            Dietary Preferences: ${JSON.stringify(dietaryPreferences)}
            
            Check for:
            - Allergens
            - Dietary restrictions
            - Nutritional considerations
            
            Return as JSON:
            {
                "compliant": true/false,
                "warnings": ["warning1", "warning2"],
                "suggestions": ["suggestion1", "suggestion2"],
                "alternatives": ["alternative1", "alternative2"]
            }
            `;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            try {
                return JSON.parse(text);
            } catch (_err) {
                return { compliant: true, warnings: [], suggestions: [], alternatives: [] };
            }
        } catch (error) {
            console.error('AI dietary analysis error:', error.message);
            return { compliant: true, warnings: [], suggestions: [], alternatives: [] };
        }
    }

    async getIngredientRecommendations({ drinkName, drinkCategory, currentIngredients, preferences, availableIngredients, menuContext }) {
        try {
            if (!this.model) throw new Error('Model not initialized');
            
            const prompt = `
            You are a coffee expert AI assistant helping customers customize their drinks with the right ingredients.
            
            DRINK CONTEXT:
            - Drink Name: ${drinkName}
            - Category: ${drinkCategory}
            - Current Ingredients: ${JSON.stringify(currentIngredients)}
            - Customer Preferences: ${JSON.stringify(preferences)}
            
            AVAILABLE INGREDIENTS:
            ${availableIngredients.map(ing => `- ${ing.name} (${ing.category}): ${ing.description || 'No description'} - Unit: ${ing.actual_unit}`).join('\n')}
            
            MENU CONTEXT:
            ${menuContext.map(item => `- ${item.name} (${item.category}): ${item.description || 'No description'} - ₱${item.base_price}`).join('\n')}
            
            TASK: Recommend 3-5 ingredients that would complement this drink based on:
            1. Flavor compatibility with the base drink
            2. Popular combinations in coffee culture
            3. Customer preferences (dietary restrictions, taste preferences)
            4. Only recommend ingredients that are actually available in our inventory
            
            Return as JSON array:
            [
                {
                    "ingredientName": "Ingredient Name",
                    "category": "Category",
                    "reason": "Why this ingredient works well with this drink",
                    "compatibility": "high|medium|low",
                    "dietaryNotes": "Any dietary considerations",
                    "suggestedQuantity": "Recommended amount/unit",
                    "priceImpact": "Estimated additional cost"
                }
            ]
            
            Focus on practical, delicious combinations that customers will love!
            `;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            try {
                const recommendations = JSON.parse(text);
                
                // Validate and filter recommendations to only include available ingredients
                const availableIngredientNames = availableIngredients.map(ing => ing.name.toLowerCase());
                
                // Filter recommendations
                const validRecommendations = (recommendations.recommendations || []).filter(rec => {
                    // Check if recommendation name contains only available ingredients
                    const recName = rec.name.toLowerCase();
                    return availableIngredientNames.some(ingName => recName.includes(ingName));
                });
                
                // Filter combinations
                const validCombinations = (recommendations.combinations || []).filter(combo => {
                    // Check if all customizations are available ingredients
                    return combo.customizations.every(custom => 
                        availableIngredientNames.some(ingName => 
                            custom.toLowerCase().includes(ingName)
                        )
                    );
                });
                
                return {
                    recommendations: validRecommendations,
                    combinations: validCombinations
                };
            } catch (parseError) {
                console.error('Failed to parse AI ingredient recommendations:', parseError);
                // Fallback: return basic recommendations based on common combinations
                return this.getFallbackIngredientRecommendations(drinkCategory, availableIngredients);
            }
        } catch (error) {
            console.error('AI ingredient recommendation error:', error.message);
            return this.getFallbackIngredientRecommendations(drinkCategory, availableIngredients);
        }
    }

    getFallbackIngredientRecommendations(drinkCategory, availableIngredients) {
        // Only suggest ingredients that are ACTUALLY available and in stock
        const healthFocusedSuggestions = [];
        const healthFocusedCombinations = [];
        
        // Get exact ingredient names for matching
        const availableNames = availableIngredients.map(ing => ing.name.toLowerCase());
        
        // Create suggestions based on EXACT available ingredients
        if (availableNames.some(name => name.includes('almond'))) {
            healthFocusedSuggestions.push({
                name: 'Almond Milk Boost',
                description: 'Creamy dairy-free alternative with subtle nutty flavor',
                price: '+₱15',
                dietaryNotes: 'Vegan, dairy-free, lower in calories than regular milk',
                isPopular: true
            });
        }
        
        if (availableNames.some(name => name.includes('caramel'))) {
            healthFocusedSuggestions.push({
                name: 'Caramel Sweetness',
                description: 'Rich caramel syrup adds smooth sweetness to your coffee',
                price: '+₱12',
                dietaryNotes: 'Adds sweetness with a rich, buttery flavor',
                isPopular: true
            });
        }
        
        if (availableNames.some(name => name.includes('sugar'))) {
            healthFocusedSuggestions.push({
                name: 'Sugar Sweetener',
                description: 'Classic sweetener that enhances coffee flavor naturally',
                price: '+₱5',
                dietaryNotes: 'Traditional sweetener, use in moderation',
                isPopular: false
            });
        }
        
        // Create combinations only from available ingredients
        const availableForCombos = availableNames.filter(name => 
            name.includes('almond') || name.includes('caramel') || name.includes('sugar')
        );
        
        if (availableForCombos.length >= 2) {
            healthFocusedCombinations.push({
                name: 'Sweet & Creamy Combo',
                customizations: availableForCombos.slice(0, 2),
                description: 'A delicious combination of available ingredients',
                totalPrice: '+₱20',
                rating: 4.5
            });
        }
        
        return {
            recommendations: healthFocusedSuggestions.slice(0, 3),
            combinations: healthFocusedCombinations
        };
    }

    async getIngredientRecommendations({ drinkName, drinkCategory, currentIngredients, preferences, availableIngredients, menuContext }) {
        try {
            if (!this.model) throw new Error('Model not initialized');
            
            const prompt = `
            As a coffee expert AI assistant, provide ingredient recommendations for customizing a ${drinkName} (${drinkCategory}).

            Current Ingredients: ${currentIngredients.join(', ') || 'None selected'}
            Customer Preferences: ${JSON.stringify(preferences)}
            
            CRITICAL: You MUST ONLY use ingredients from this EXACT list of available ingredients:
            ${availableIngredients.map(ing => `- ${ing.name}`).join('\n')}
            
            Available ingredient names: ${availableIngredients.map(ing => ing.name).join(', ')}
            
            Menu Context:
            ${menuContext.map(item => `- ${item.name} (${item.category}): ₱${item.base_price}`).join('\n')}
            
            STRICT RULES - VIOLATION WILL CAUSE ERRORS:
            1. ONLY use ingredient names from the available list: ${availableIngredients.map(ing => ing.name).join(', ')}
            2. DO NOT suggest "Oat Milk", "Vanilla Extract", "Cardamom", or any ingredient not in the available list
            3. DO NOT create combinations with ingredients not in the available list
            4. If you suggest a combination, ALL ingredients must be from the available list
            5. Focus on health benefits of ONLY the available ingredients
            
            Available ingredients for suggestions: ${availableIngredients.map(ing => ing.name).join(', ')}
            
            Please provide:
            1. 2-3 ingredient recommendations using ONLY: ${availableIngredients.map(ing => ing.name).join(', ')}
            2. Popular combinations using ONLY: ${availableIngredients.map(ing => ing.name).join(', ')}
            3. Health-focused suggestions based on what's actually in stock
            
            Format your response as JSON:
            {
                "recommendations": [
                    {
                        "name": "Recommendation Name",
                        "description": "Why this works well with health benefits",
                        "price": "+₱XX",
                        "dietaryNotes": "Health and dietary considerations",
                        "isPopular": true
                    }
                ],
                "combinations": [
                    {
                        "name": "Combination Name",
                        "customizations": ["Ingredient1", "Ingredient2"],
                        "description": "Why this combination works with health benefits",
                        "totalPrice": "+₱XX",
                        "rating": 4.8
                    }
                ]
            }
            `;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            // Try to parse JSON response
            try {
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
            } catch (parseError) {
                console.warn('Failed to parse AI response as JSON:', parseError);
            }
            
            // Fallback response
            return {
                recommendations: [
                    {
                        name: 'Perfect Balance',
                        description: 'Recommended milk and sweetener combination for this drink',
                        price: '+₱25',
                        dietaryNotes: 'Balanced flavor profile',
                        isPopular: true
                    }
                ],
                combinations: [
                    {
                        name: 'Barista Special',
                        customizations: ['Extra Shot', 'Cinnamon', 'Whipped Cream'],
                        description: 'A barista favorite combination',
                        totalPrice: '+₱40',
                        rating: 4.8
                    }
                ]
            };
        } catch (error) {
            console.error('Error getting ingredient recommendations:', error);
            // Return fallback recommendations
            return {
                recommendations: [
                    {
                        name: 'Classic Enhancement',
                        description: 'Traditional additions that enhance the drink',
                        price: '+₱20',
                        dietaryNotes: 'Suitable for most dietary preferences',
                        isPopular: true
                    }
                ],
                combinations: [
                    {
                        name: 'Customer Favorite',
                        customizations: ['Extra Shot', 'Whipped Cream'],
                        description: 'Most popular combination for this drink',
                        totalPrice: '+₱35',
                        rating: 4.7
                    }
                ]
            };
        }
    }
}

module.exports = new AIService();