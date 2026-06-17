class SITGSearchEngine {
    constructor(indexPath) {
        this.indexPath = indexPath;
        this.synonyms = {};
        this.intentKeywords = { commercial: [] };
        this.recommendations = [];
        this.documents = [];
        this.isInitialized = false;
    }

    async initialize() {
        try {
            const response = await fetch(this.indexPath);
            if (!response.ok) throw new Error(`HTTP network error: status ${response.status}`);
            const data = await response.json();
            
            this.synonyms = data.synonyms || {};
            this.intentKeywords = data.intent_keywords || { commercial: [] };
            this.recommendations = data.recommendations || [];
            this.documents = data.documents || [];
            this.isInitialized = true;
            console.log("SITG Search Engine successfully instantiated locally.");
        } catch (error) {
            console.error("Critical error loading SITG static search matrix index:", error);
        }
    }

    tokenize(text) {
        return text.toLowerCase()
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ")
            .split(/\s+/)
            .filter(token => token.length > 0);
    }

    expandQueryTokens(queryText) {
        const initialTokens = this.tokenize(queryText);
        let expandedTokens = [...initialTokens];

        const normalizedQuery = initialTokens.join(" ");
        for (const [key, variants] of Object.entries(this.synonyms)) {
            if (normalizedQuery.includes(key)) {
                expandedTokens.push(...this.tokenize(key));
                variants.forEach(v => expandedTokens.push(...this.tokenize(v)));
            }
            for (const variant of variants) {
                if (normalizedQuery.includes(variant)) {
                    expandedTokens.push(...this.tokenize(key));
                    variants.forEach(v => expandedTokens.push(...this.tokenize(v)));
                    break;
                }
            }
        }
        return [...new Set(expandedTokens)];
    }

    detectIntent(queryText) {
        const tokens = this.tokenize(queryText);
        const isCommercial = tokens.some(token => 
            this.intentKeywords.commercial.some(keyword => 
                token.includes(keyword) || keyword.includes(token)
            )
        );
        return isCommercial ? "COMMERCIAL" : "EDUCATIONAL";
    }

    computeRecommendations(queryText) {
        const tokens = this.expandQueryTokens(queryText);
        if (tokens.length === 0) return null;

        let bestMatch = null;
        let maxIntersection = 0;

        for (const rule of this.recommendations) {
            let intersectionCount = 0;
            for (const ruleTokenExpr of rule.tokens) {
                const ruleTokens = this.tokenize(ruleTokenExpr);
                const matchFound = ruleTokens.every(rt => 
                    tokens.some(t => t.includes(rt) || rt.includes(t))
                );
                if (matchFound) intersectionCount += ruleTokens.length;
            }

            if (intersectionCount > maxIntersection) {
                maxIntersection = intersectionCount;
                bestMatch = rule;
            }
        }

        return bestMatch;
    }

    search(queryText) {
        if (!this.isInitialized || !queryText.trim()) {
            return { intent: "EDUCATIONAL", recommendations: null, results: [] };
        }

        const queryTokens = this.expandQueryTokens(queryText);
        const intent = this.detectIntent(queryText);
        const recommendationBlock = this.computeRecommendations(queryText);

        const scoredDocs = this.documents.map(doc => {
            let score = 0;
            const docTitleTokens = this.tokenize(doc.title);
            const docDescTokens = this.tokenize(doc.desc);
            const docContentTokens = this.tokenize(doc.content);

            queryTokens.forEach(qToken => {
                docTitleTokens.forEach(tToken => {
                    if (tToken === qToken) score += 100;
                    else if (tToken.includes(qToken) || qToken.includes(tToken)) score += 40;
                });

                docDescTokens.forEach(dToken => {
                    if (dToken === qToken) score += 30;
                    else if (dToken.includes(qToken) || qToken.includes(dToken)) score += 10;
                });

                docContentTokens.forEach(cToken => {
                    if (cToken === qToken) score += 5;
                });
            });

            return { ...doc, score };
        }).filter(doc => doc.score > 0);

        const typePriority = this.getTypePriorityLayout(intent);
        
        scoredDocs.sort((a, b) => {
            const priorityA = typePriority[a.type] !== undefined ? typePriority[a.type] : 99;
            const priorityB = typePriority[b.type] !== undefined ? typePriority[b.type] : 99;

            if (priorityA !== priorityB) return priorityA - priorityB;
            return b.score - a.score;
        });

        this.trackAnalytics(queryText, scoredDocs.length);

        return {
            intent,
            recommendations: recommendationBlock,
            results: scoredDocs
        };
    }

    getTypePriorityLayout(intent) {
        if (intent === "COMMERCIAL") {
            return {
                "Services": 1,
                "Discovery Sprint": 2,
                "Plain English Translator": 3,
                "Lexicon": 4,
                "FAQs": 5,
                "Whitepapers": 6,
                "Thematic Reviews": 7
            };
        } else {
            return {
                "Plain English Translator": 1,
                "Lexicon": 2,
                "Services": 3,
                "Discovery Sprint": 4,
                "FAQs": 5,
                "Whitepapers": 6,
                "Thematic Reviews": 7
            };
        }
    }

    trackAnalytics(searchTerm, resultCount) {
        const eventPayload = {
            event: "sitg_knowledge_search",
            search_term: searchTerm.trim().toLowerCase(),
            results_returned: resultCount,
            timestamp: new Date().toISOString()
        };
        
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push(eventPayload);

        let localLogs = JSON.parse(localStorage.getItem("sitg_search_analytics") || "[]");
        localLogs.push(eventPayload);
        if (localLogs.length > 500) localLogs.shift();
        localStorage.setItem("sitg_search_analytics", JSON.stringify(localLogs));
    }

    trackClick(searchTerm, destinationUrl) {
        const clickPayload = {
            event: "sitg_search_click",
            search_term: searchTerm.trim().toLowerCase(),
            target_destination: destinationUrl,
            timestamp: new Date().toISOString()
        };
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push(clickPayload);
        
        let localLogs = JSON.parse(localStorage.getItem("sitg_search_analytics") || "[]");
        localLogs.push(clickPayload);
        localStorage.setItem("sitg_search_analytics", JSON.stringify(localLogs));
    }
}