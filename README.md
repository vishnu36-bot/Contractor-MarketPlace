# BuildMate India - Contractor & Material Marketplace

BuildMate is a comprehensive platform connecting homeowners, builders, and contractors with construction services and material suppliers across India.

## Features

- **Contractor Marketplace**: Browse, filter, and connect with verified contractors by trade and location.
- **Material Marketplace**: Search and order construction materials.
- **Interactive UI**: Responsive frontend interface for clients and service providers.
- **RESTful API**: Fast and scalable backend powered by FastAPI.

## Tech Stack

- **Backend**: FastAPI (Python), SQLite
- **Frontend**: HTML5, CSS3, JavaScript
- **Server**: Uvicorn

## Getting Started

### Prerequisites

- Python 3.7+
- pip

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/vishnu36-bot/contractor-marketplace.git
   cd contractor-marketplace
   ```

2. Install dependencies:
   ```bash
   pip install fastapi uvicorn pydantic
   ```

3. Run the application:
   ```bash
   run.bat
   ```
   or manually:
   ```bash
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
   ```

4. Open your browser at `http://127.0.0.1:8000`.
