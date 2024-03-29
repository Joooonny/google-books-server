import { Router, Request, Response } from "express";
import { body } from "express-validator";
import { getWriterById, writeBook, isBookExists, deleteBook, editBook, getEarnings, getBooks, } from "../fileManager";
import { validationMiddleware } from "../middlewares/validationMiddleware";
const router = Router({ mergeParams: true });

router.get('/',
    ({ params: { wId } }: Request, res: Response) =>
        res.status(200).json(getWriterById(wId))
)

router.get('/books', ({ params: { rId } }: Request, res: Response) => res.status(200).json(getBooks(rId, 'WRITER')))

router.post(
    '/book',
    body('title').isString().notEmpty().withMessage('Invalid title'),
    body('price').isNumeric().withMessage('Invalid price'),
    body('genre').isString().notEmpty().withMessage('Invalid genre'),
    body('description').isString().notEmpty().withMessage('Invalid description'),
    body('editors').isArray().notEmpty().withMessage('Invalid editors'),
    body('img').isString().notEmpty().withMessage('Invalid img'),
    validationMiddleware,
    ({ body: { title, price, genre, description, editors, img }, params: { wId } }: Request, res: Response) => {
        writeBook(title, price, genre, description, wId, editors, img);
        return res.status(201).json({ message: 'Book posted' });
    }
)

router.delete('/book',
    body('bookId').isNumeric(),
    validationMiddleware,
    ({ body: { bookId } }: Request, res: Response) => {
        if (!isBookExists(bookId)) return res.status(404).json('Book not found')
        deleteBook(bookId);
        return res.status(204).json('Book deleted');
    }
)

router.put('/book',
    body('bookId').isUUID().notEmpty().withMessage('Invalid bookId'),
    body('title').isString().notEmpty().withMessage('Invalid title'),
    body('price').isNumeric().withMessage('Invalid price'),
    body('description').isString().notEmpty().withMessage('Invalid description'),
    validationMiddleware,
    ({ body: { bookId, title, price, description } }: Request, res: Response) => {
        if (!isBookExists(bookId)) return res.status(404).json('Book not found');
        editBook(bookId, title, price, description)
        return res.status(200).json('Book edited')
    }
)

export default router;
