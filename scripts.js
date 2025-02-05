// Add at the start of scripts.js
const DEBUG = true;

function logDebug(message, data) {
    if (DEBUG) {
        console.log(`[DEBUG] ${message}:`, data);
    }
}

// Initialize charts
let priceChart;
let volumeChart;

// API configuration
const POLYGON_BASE_URL = 'https://api.polygon.io/v2';
const STOCK_TICKER = 'AMZN';

// Add rate limiting configuration
const API_CONFIG = {
    lastRequest: 0,
    minRequestInterval: 15000, // 15 seconds between requests
    maxRetries: 3,
    retryDelay: 20000 // 20 seconds
};

// Function to format numbers for display
function formatNumber(num) {
    return new Intl.NumberFormat('en-US').format(num);
}

// Function to format currency with trillion support
function formatCurrency(num) {
    if (num >= 1e12) {
        return `$${(num / 1e12).toFixed(2)}T`;
    } else if (num >= 1e9) {
        return `$${(num / 1e9).toFixed(2)}B`;
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
}

// Add delay function
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Add rate limiting function
async function waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - API_CONFIG.lastRequest;
    if (timeSinceLastRequest < API_CONFIG.minRequestInterval) {
        await delay(API_CONFIG.minRequestInterval - timeSinceLastRequest);
    }
    API_CONFIG.lastRequest = Date.now();
}

// Function to fetch current stock data
async function fetchCurrentData(retryCount = 0) {
    try {
        logDebug('Fetching current data, attempt', retryCount + 1);
        await waitForRateLimit();
        const response = await fetch(
            `${POLYGON_BASE_URL}/aggs/ticker/${STOCK_TICKER}/prev?apiKey=${config.POLYGON_API_KEY}`
        );
        
        if (response.status === 429 && retryCount < API_CONFIG.maxRetries) {
            console.log(`Rate limited, retrying in ${API_CONFIG.retryDelay}ms...`);
            await delay(API_CONFIG.retryDelay);
            return fetchCurrentData(retryCount + 1);
        }

        const data = await response.json();
        
        if (data.results && data.results[0]) {
            const result = data.results[0];
            
            // Update current price
            document.getElementById('currentPrice').textContent = formatCurrency(result.c);
            
            // Update volume
            document.getElementById('volume').textContent = formatNumber(result.v);
            
            // Update 24h change
            const priceChange = result.c - result.o;
            const changePercent = (priceChange / result.o) * 100;
            const changeElement = document.getElementById('dayChange');
            const changeText = `${formatCurrency(priceChange)} (${changePercent.toFixed(2)}%)`;
            changeElement.textContent = changeText;
            changeElement.className = priceChange >= 0 ? 'metric-value positive' : 'metric-value negative';
            
            // Update market cap (using Amazon's approximate shares outstanding)
            const sharesOutstanding = 10.2e9; // Amazon's approximate shares outstanding
            const marketCap = result.c * sharesOutstanding;
            document.getElementById('marketCap').textContent = formatCurrency(marketCap);
        }
    } catch (error) {
        logDebug('Error in fetchCurrentData', error);
        console.error('Error fetching current data:', error);
        if (retryCount < API_CONFIG.maxRetries) {
            await delay(API_CONFIG.retryDelay);
            return fetchCurrentData(retryCount + 1);
        }
        // Set error state for metrics if all retries fail
        document.getElementById('currentPrice').textContent = 'Error loading data';
        document.getElementById('dayChange').textContent = 'Error loading data';
        document.getElementById('volume').textContent = 'Error loading data';
        document.getElementById('marketCap').textContent = 'Error loading data';
    }
}

// Function to fetch historical data for charts
async function fetchHistoricalData(retryCount = 0) {
    try {
        await waitForRateLimit();
        const toDate = new Date();
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 30); // Reduce to 30 days to minimize data

        const response = await fetch(
            `${POLYGON_BASE_URL}/aggs/ticker/${STOCK_TICKER}/range/1/day/${Math.floor(fromDate.getTime()/1000)}/${Math.floor(toDate.getTime()/1000)}?adjusted=true&sort=asc&limit=30&apiKey=${config.POLYGON_API_KEY}`
        );
        
        if (response.status === 429 && retryCount < API_CONFIG.maxRetries) {
            console.log(`Rate limited, retrying in ${API_CONFIG.retryDelay}ms...`);
            await delay(API_CONFIG.retryDelay);
            return fetchHistoricalData(retryCount + 1);
        }

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Historical Data:', data); // Debug log
        return data;
    } catch (error) {
        console.error('Error fetching historical data:', error);
        if (retryCount < API_CONFIG.maxRetries) {
            await delay(API_CONFIG.retryDelay);
            return fetchHistoricalData(retryCount + 1);
        }
        return null;
    }
}

// Function to analyze price movements and find buy/sell points
function analyzeTradingPoints(data) {
    const points = {
        buy: [],
        sell: []
    };
    
    // Simple strategy: Buy when price crosses above 5-day MA, Sell when it crosses below
    const period = 5;
    for (let i = period; i < data.length; i++) {
        const ma = data.slice(i - period, i).reduce((sum, item) => sum + item.c, 0) / period;
        const prevMa = data.slice(i - period - 1, i - 1).reduce((sum, item) => sum + item.c, 0) / period;
        
        if (data[i].c > ma && data[i-1].c <= prevMa) {
            points.buy.push(i);
        }
        if (data[i].c < ma && data[i-1].c >= prevMa) {
            points.sell.push(i);
        }
    }
    return points;
}

// Function to update charts with new data
function updateCharts(data) {
    if (!data || !Array.isArray(data)) {
        console.error('Invalid data format for charts:', data);
        return;
    }

    // Limit data points to last 30 days for better performance
    const limitedData = data.slice(-30);
    const dates = limitedData.map(item => new Date(item.t).toLocaleDateString());
    const prices = limitedData.map(item => item.c);
    const volumes = limitedData.map(item => item.v);
    
    const tradingPoints = analyzeTradingPoints(limitedData);

    // Update price chart with optimized configuration
    const priceCtx = document.getElementById('priceChart').getContext('2d');
    if (priceChart) {
        priceChart.destroy();
    }
    
    priceChart = new Chart(priceCtx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                {
                    label: 'AMZN',
                    data: prices,
                    borderColor: '#1a237e',
                    tension: 0.1,
                    fill: false,
                    pointRadius: 0 // Remove points for better performance
                },
                {
                    label: 'Buy',
                    data: prices.map((price, index) => 
                        tradingPoints.buy.includes(index) ? price : null),
                    pointBackgroundColor: '#4CAF50',
                    pointRadius: 6,
                    showLine: false
                },
                {
                    label: 'Sell',
                    data: prices.map((price, index) => 
                        tradingPoints.sell.includes(index) ? price : null),
                    pointBackgroundColor: '#f44336',
                    pointRadius: 6,
                    showLine: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2,
            animation: false, // Disable animations for better performance
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        boxWidth: 20,
                        padding: 10
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 10
                    }
                },
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        },
                        maxTicksLimit: 6
                    }
                }
            }
        }
    });

    // Update volume chart with optimized configuration
    const volumeCtx = document.getElementById('volumeChart').getContext('2d');
    if (volumeChart) {
        volumeChart.destroy();
    }

    volumeChart = new Chart(volumeCtx, {
        type: 'bar',
        data: {
            labels: dates,
            datasets: [{
                label: 'Volume',
                data: volumes,
                backgroundColor: '#0277bd'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2,
            animation: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return `Volume: ${formatNumber(context.parsed.y)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 10
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatNumber(value);
                        },
                        maxTicksLimit: 6
                    }
                }
            }
        }
    });
}

// Add AI Analysis function
async function updateAIAnalysis(data) {
    try {
        const recentPrices = data.slice(-5).map(item => item.c);
        const currentPrice = recentPrices[recentPrices.length - 1];
        const priceChange = ((currentPrice - recentPrices[0]) / recentPrices[0]) * 100;
        
        const prompt = `
            Analyze this Amazon (AMZN) stock data:
            Current Price: ${formatCurrency(currentPrice)}
            5-day Price Change: ${priceChange.toFixed(2)}%
            Recent Prices: ${recentPrices.map(p => formatCurrency(p)).join(', ')}
            
            Provide a concise analysis in JSON format with these keys:
            - technical: Technical analysis of price movements
            - sentiment: Market sentiment analysis
            - signals: Trading signals with reasoning
            - risk: Key risk factors
            
            Keep each section under 50 words.
        `;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [{
                    role: "user",
                    content: prompt
                }],
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        const analysis = JSON.parse(result.choices[0].message.content);

        // Update the UI
        document.getElementById('technicalAnalysis').textContent = analysis.technical;
        document.getElementById('marketSentiment').textContent = analysis.sentiment;
        document.getElementById('tradingSignals').textContent = analysis.signals;
        document.getElementById('riskAssessment').textContent = analysis.risk;
    } catch (error) {
        console.error('Error updating AI analysis:', error);
        const errorMessage = 'Analysis temporarily unavailable';
        document.getElementById('technicalAnalysis').textContent = errorMessage;
        document.getElementById('marketSentiment').textContent = errorMessage;
        document.getElementById('tradingSignals').textContent = errorMessage;
        document.getElementById('riskAssessment').textContent = errorMessage;
    }
}

// Update initialize function with better interval timing
async function initialize() {
    try {
        logDebug('Starting initialization');
        
        // Test Polygon.io API
        const testResponse = await fetch(
            `${POLYGON_BASE_URL}/aggs/ticker/${STOCK_TICKER}/prev?apiKey=${config.POLYGON_API_KEY}`
        );
        logDebug('API Test Response', await testResponse.json());

        // Show loading state
        document.getElementById('currentPrice').textContent = 'Loading...';
        document.getElementById('dayChange').textContent = 'Loading...';
        document.getElementById('volume').textContent = 'Loading...';
        document.getElementById('marketCap').textContent = 'Loading...';

        // Fetch initial data
        const historicalData = await fetchHistoricalData();
        if (historicalData && historicalData.results) {
            updateCharts(historicalData.results);
            await updateAIAnalysis(historicalData.results);
        }
        await fetchCurrentData();

        // Update current data every 15 seconds
        setInterval(fetchCurrentData, 15000);
        
        // Update historical data and charts every 2 minutes
        setInterval(async () => {
            const data = await fetchHistoricalData();
            if (data && data.results) {
                updateCharts(data.results);
                await updateAIAnalysis(data.results);
            }
        }, 120000);

    } catch (error) {
        logDebug('Initialization error', error);
        // Show error state
        document.getElementById('currentPrice').textContent = 'Error loading data';
        document.getElementById('dayChange').textContent = 'Error loading data';
        document.getElementById('volume').textContent = 'Error loading data';
        document.getElementById('marketCap').textContent = 'Error loading data';
    }
}

// Start the application when the page loads
document.addEventListener('DOMContentLoaded', initialize); 