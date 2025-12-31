import { Router } from 'express';
import { CardController } from '../controllers/card.controller';

const router = Router();

router.get('/', CardController.getCards);
router.post('/', CardController.createCard);
router.put('/:id', CardController.updateCard);
router.delete('/:id', CardController.deleteCard);

export default router;
