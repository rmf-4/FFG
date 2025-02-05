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

// Initialize TradingView widget
let tradingViewWidget;

// Constants
const STOCK_TICKER = 'AMZN';
const MARKETWATCH_URL = 'https://www.marketwatch.com/investing/stock/amzn';

// Cache configuration
const CACHE_CONFIG = {
    STOCK_DATA_KEY: 'amzn_data',
    LAST_FETCH_KEY: 'amzn_last_fetch',
    MAX_AGE_MS: 5 * 60 * 1000 // 5 minutes in milliseconds
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

// Cache management functions
function saveToCache(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify({
            timestamp: Date.now(),
            data: data
        }));
    } catch (error) {
        console.error('Error saving to cache:', error);
    }
}

function getFromCache(key) {
    try {
        const cached = localStorage.getItem(key);
        if (!cached) return null;
        
        const { timestamp, data } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        
        if (age < CACHE_CONFIG.MAX_AGE_MS) {
            return data;
        } else {
            localStorage.removeItem(key);
            return null;
        }
    } catch (error) {
        console.error('Error reading from cache:', error);
        return null;
    }
}

// Function to fetch stock data by scraping MarketWatch
async function fetchStockData(forceRefresh = false) {
    try {
        // Check cache first unless force refresh is requested
        if (!forceRefresh) {
            const cachedData = getFromCache(CACHE_CONFIG.STOCK_DATA_KEY);
            if (cachedData) {
                updateUI(cachedData);
                return cachedData;
            }
        }

        // Create a proxy URL to bypass CORS
        const proxyUrl = 'https://api.allorigins.win/raw?url=';
        const response = await fetch(proxyUrl + encodeURIComponent(MARKETWATCH_URL));

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Extract data using more specific selectors
        const priceElement = doc.querySelector('h2[class*="intraday__price"] bg-quote');
        const openElement = doc.querySelector('td[class*="price__open"]');
        const volumeElement = doc.querySelector('td[class*="price__volume"]');

        // Parse current price
        const price = parseFloat(priceElement?.textContent?.replace(/[^0-9.-]+/g, '') || '0');
        
        // Parse opening price
        const openPrice = parseFloat(openElement?.textContent?.replace(/[^0-9.-]+/g, '') || price);
        
        // Calculate change from open
        const change = price - openPrice;
        const changePercent = (change / openPrice) * 100;
        
        // Better volume parsing with debugging
        let volume = 0;
        if (volumeElement) {
            const volumeText = volumeElement.textContent.trim();
            console.log('Volume text:', volumeText); // Debug log
            
            // Remove all commas first
            const cleanText = volumeText.replace(/,/g, '');
            
            if (cleanText.includes('M')) {
                volume = parseFloat(cleanText.replace('M', '')) * 1000000;
            } else if (cleanText.includes('K')) {
                volume = parseFloat(cleanText.replace('K', '')) * 1000;
            } else {
                volume = parseInt(cleanText.replace(/[^0-9]+/g, '')) || 0;
            }
        }

        // Create data object
        const data = {
            price: price || 0,
            openPrice: openPrice || 0,
            change: change || 0,
            changePercent: changePercent || 0,
            volume: volume || 0,
            timestamp: Date.now()
        };

        // Debug log the parsed data
        console.log('Parsed data:', data);

        // Save to cache
        saveToCache(CACHE_CONFIG.STOCK_DATA_KEY, data);
        
        // Update UI
        updateUI(data);
        
        return data;
    } catch (error) {
        console.error('Error fetching stock data:', error);
        setErrorState();
        return null;
    }
}

// Function to update UI with data
function updateUI(data) {
    // Update current price
    document.getElementById('currentPrice').textContent = formatCurrency(data.price);
    
    // Update volume with better formatting
    const formattedVolume = data.volume >= 1000000 
        ? `${(data.volume / 1000000).toFixed(2)}M`
        : data.volume >= 1000 
            ? `${(data.volume / 1000).toFixed(2)}K`
            : formatNumber(data.volume);
    document.getElementById('volume').textContent = formattedVolume;
    
    // Update 24h change (change since market open)
    const changeElement = document.getElementById('dayChange');
    const changeText = `${formatCurrency(data.change)} (${data.changePercent.toFixed(2)}%)`;
    changeElement.textContent = changeText;
    changeElement.className = data.change >= 0 ? 'metric-value positive' : 'metric-value negative';
    
    // Update market cap
    const sharesOutstanding = 10.2e9;
    const marketCap = data.price * sharesOutstanding;
    document.getElementById('marketCap').textContent = formatCurrency(marketCap);

    // Update last updated time
    const lastUpdated = new Date(data.timestamp).toLocaleTimeString();
    document.getElementById('lastUpdated').textContent = `Last updated: ${lastUpdated}`;
}

// Function to set error state
function setErrorState() {
    document.getElementById('currentPrice').textContent = 'Error loading data';
    document.getElementById('dayChange').textContent = 'Error loading data';
    document.getElementById('volume').textContent = 'Error loading data';
    document.getElementById('marketCap').textContent = 'Error loading data';
    document.getElementById('lastUpdated').textContent = 'Failed to update';
}

// Function to initialize TradingView widget
function initTradingViewWidget() {
    tradingViewWidget = new TradingView.widget({
        "width": "100%",
        "height": "100%",
        "symbol": "NASDAQ:AMZN",
        "interval": "D",
        "timezone": "local",
        "theme": "light",
        "style": "1",
        "locale": "en",
        "toolbar_bg": "#f1f3f6",
        "enable_publishing": false,
        "hide_side_toolbar": false,
        "allow_symbol_change": true,
        "container_id": "tradingview-widget",
        "save_image": true,
        "studies": [
            "Volume@tv-basicstudies",
            "MACD@tv-basicstudies",
            "RSI@tv-basicstudies"
        ]
    });
}

// Initialize function
async function initialize() {
    try {
        // Show loading state
        document.getElementById('currentPrice').textContent = 'Loading...';
        document.getElementById('dayChange').textContent = 'Loading...';
        document.getElementById('volume').textContent = 'Loading...';
        document.getElementById('marketCap').textContent = 'Loading...';
        document.getElementById('lastUpdated').textContent = 'Loading...';

        // Initialize TradingView widget
        initTradingViewWidget();

        // Initial data fetch
        await fetchStockData(true);

        // Set up auto-refresh every 5 minutes
        setInterval(() => fetchStockData(true), CACHE_CONFIG.MAX_AGE_MS);

    } catch (error) {
        console.error('Failed to initialize:', error);
        setErrorState();
    }
}

// Start the application when the page loads
document.addEventListener('DOMContentLoaded', initialize); 