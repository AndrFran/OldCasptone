# Products API Router - UC1
# Endpoints for browsing products with current stock levels

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import logging

from shared.db import get_db
from shared.models import Product
from shared.schemas import ProductResponse, ProductList

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/products", tags=["UC1-Products"])


@router.get(
    "",
    response_model=ProductList,
    summary="List all products",
    description="Returns all available products with current stock levels, with optional filtering and sorting",
)
async def list_products(
    skip: int = 0,
    limit: int = 100,
    color: str = None,
    silhouette: str = None,
    brand: str = None,
    sort: str = "recommended",
    db: Session = Depends(get_db),
) -> ProductList:
    """
    Get all products with pagination, filtering, and sorting.

    **Query Parameters:**
    - `skip`: Number of items to skip (default: 0)
    - `limit`: Maximum items to return (default: 100)
    - `color`: Filter by color (e.g., 'Navy', 'Black')
    - `silhouette`: Filter by silhouette (e.g., '9FORTY', '9FIFTY')
    - `brand`: Filter by brand (e.g., 'New Era')
    - `sort`: Sort order - 'recommended' (default), 'price_asc', 'price_desc', 'newest'

    **Response:**
    ```json
    {
        "items": [
            {
                "id": 1,
                "name": "New York Yankees 9FORTY",
                "description": "Classic trucker style...",
                "price": 34.99,
                "stock": 25,
                "brand": "New Era",
                "color": "Navy",
                "silhouette": "9FORTY",
                "sale_price": 29.99
            }
        ],
        "total": 15
    }
    ```
    """
    try:
        query = db.query(Product)

        # Apply filters
        if color:
            query = query.filter(Product.color == color)
        if silhouette:
            query = query.filter(Product.silhouette == silhouette)
        if brand:
            query = query.filter(Product.brand == brand)

        # Get total count after filtering
        total = query.count()

        # Apply sorting
        if sort == "price_asc":
            query = query.order_by(Product.price.asc())
        elif sort == "price_desc":
            query = query.order_by(Product.price.desc())
        elif sort == "newest":
            query = query.order_by(Product.created_at.desc())
        else:  # recommended (default)
            query = query.order_by(Product.id.asc())

        # Get paginated products
        products = query.offset(skip).limit(limit).all()

        return ProductList(
            items=[ProductResponse.from_orm(p) for p in products],
            total=total
        )

    except Exception as e:
        logger.error(f"Error listing products: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list products"
        )


@router.get(
    "/{product_id}",
    response_model=ProductResponse,
    summary="Get product details",
    description="Returns full details of a single product",
)
async def get_product(
    product_id: int,
    db: Session = Depends(get_db),
) -> ProductResponse:
    """
    Get a single product by ID.

    **Parameters:**
    - `product_id`: Product ID

    **Response (200 OK):**
    ```json
    {
        "id": 1,
        "name": "Widget A",
        "description": "Premium widget",
        "price": 29.99,
        "stock": 50,
        "low_stock_threshold": 10,
        "created_at": "2026-07-23T10:00:00Z"
    }
    ```

    **Error:**
    - **404 Not Found:** Product doesn't exist
    """

    try:
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product {product_id} not found"
            )

        return ProductResponse.from_orm(product)

    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Error retrieving product {product_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve product"
        )
