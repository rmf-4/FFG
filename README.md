# FFG - Financial Future Graph

A web application for visualizing and analyzing Amazon stock price trends. This project aims to provide clear and interactive visualizations of AMZN stock performance over time.

## Features
- Historical stock price visualization using Chart.js
- Real-time data updates (every minute)
- Interactive price charts with tooltips
- Key metrics display (Current Price, 24h Change, Volume, Market Cap)
- Responsive design for all devices

## Technologies
- HTML
- CSS
- JavaScript
- Chart.js for data visualization
- Alpha Vantage API for real-time stock data

## API Integration
This project uses the Alpha Vantage API to fetch real-time and historical stock data. The API provides:
- Daily time series data
- Real-time price updates
- Trading volume information
- Historical price trends

## Setup
1. Clone the repository
2. Open index.html in a web browser
3. The chart will automatically load with the latest AMZN stock data

## Note
The Alpha Vantage API has rate limits:
- 25 API calls per day for free tier
- 5 API calls per minute
