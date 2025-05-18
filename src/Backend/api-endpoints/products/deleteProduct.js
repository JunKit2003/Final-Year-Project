// src/api/controllers/products/deleteProduct.js
import {
    DatabaseConnectionError,
    InputValidationError,
    ProductNotFoundError,
    deleteProductFromDB
  } from '../../database/utils.js';
  
  export default async function deleteProduct(req, res) {
    try {
      const { id } = req.params;
      await deleteProductFromDB(id);
      res.status(200).send({ message: 'Product deleted successfully!' });
    } catch (error) {
      if (
        error instanceof InputValidationError ||
        error instanceof SyntaxError
      ) {
        return res.status(400).json({ message: error.message });
      } else if (error instanceof ProductNotFoundError) {
        return res.status(409).json({ message: error.message });
      } else if (error instanceof DatabaseConnectionError) {
        return res.status(500).json({
          message: 'Unable to connect to the database!'
        });
      } else {
        console.error('Error deleting product: ', error);
        res.status(500).send({ message: 'Internal server error: ', error });
      }
    }
  }
  