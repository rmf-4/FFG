# FFG - Financial Future Graph

A web application for visualizing and analyzing Amazon stock price trends. This project aims to provide clear and interactive visualizations of AMZN stock performance over time.

## Features
- Historical stock price visualization using Chart.js
- Real-time data updates (every 10 seconds)
- Interactive price charts with tooltips
- Technical analysis indicators (20-day SMA)
- Volume analysis
- Key metrics display (Current Price, 24h Change, Volume, Market Cap)
- Responsive design for all devices

## Technologies
- HTML
- CSS
- JavaScript
- Chart.js for data visualization
- Finnhub.io API for real-time stock data

## API Integration
This project uses the Finnhub.io API which provides:
- Historical candle data
- Real-time price updates
- Trading volume information
- Market statistics
- Free tier with generous limits (60 API calls per minute)

## Setup
1. Clone the repository
2. Sign up for a free API key at https://finnhub.io/register
3. Add your Finnhub API key to scripts.js
4. Open index.html in a web browser

## Features
- Real-time price updates every 10 seconds
- Chart updates every minute
- Technical analysis with moving averages
- Volume analysis with separate chart
- Color-coded price changes

## API Limits
Finnhub.io free tier provides:
- 60 API calls per minute
- Real-time US stock data
- Historical data
- No daily limit
