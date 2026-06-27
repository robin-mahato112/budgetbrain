import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import MiniChatbot from '../components/chatbot/MiniChatbot';
import { chatService } from '../services/chatService';

vi.mock('../services/chatService', () => ({
  chatService: { send: vi.fn() },
}));

describe('MiniChatbot', () => {
  it('sends a message and renders the AI reply', async () => {
    chatService.send.mockResolvedValue({ chatId: 'chat-1', reply: 'Start with a simple monthly budget.' });
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><MiniChatbot /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Message BudgetBrain AI'), { target: { value: 'Help me budget' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    await waitFor(() => expect(chatService.send).toHaveBeenCalledWith('Help me budget', null));
    expect(await screen.findByText('Start with a simple monthly budget.')).toBeInTheDocument();
  });
});
