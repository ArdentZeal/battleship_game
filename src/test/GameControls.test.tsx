import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GameControls from '../components/GameControls';

describe('GameControls', () => {
    const defaultProps = {
        status: 'placement' as const,
        onStart: vi.fn(),
        onReset: vi.fn(),
        onRandomize: vi.fn(),
        allowAdjacent: false,
        onToggleAdjacent: vi.fn(),
        placementMode: 'random' as const,
        onPlacementModeChange: vi.fn(),
        canStartGame: true,
        aiDifficulty: 'random' as const,
        onAIDifficultyChange: vi.fn(),
        gameMode: 'vsAI' as const,
        onBackToMenu: vi.fn(),
    };

    it('renders start and reset buttons', () => {
        render(<GameControls {...defaultProps} />);

        expect(screen.getByText('Start Game')).toBeInTheDocument();
        expect(screen.getByText('Reset Board')).toBeInTheDocument();
    });

    it('calls onStart when start button is clicked', () => {
        render(<GameControls {...defaultProps} />);

        fireEvent.click(screen.getByText('Start Game'));
        expect(defaultProps.onStart).toHaveBeenCalled();
    });

    it('disables start button when canStartGame is false', () => {
        render(<GameControls {...defaultProps} canStartGame={false} />);

        const startButton = screen.getByText('Start Game');
        expect(startButton).toBeDisabled();
    });

    it('shows randomize button only in random placement mode', () => {
        const { rerender } = render(<GameControls {...defaultProps} placementMode="random" />);
        expect(screen.getByText('Randomize Ships')).toBeInTheDocument();

        rerender(<GameControls {...defaultProps} placementMode="manual" />);
        expect(screen.queryByText('Randomize Ships')).not.toBeInTheDocument();
    });

    it('calls onToggleAdjacent when checkbox is clicked', () => {
        render(<GameControls {...defaultProps} />);

        const checkbox = screen.getByLabelText('Allow ships to touch');
        fireEvent.click(checkbox);
        expect(defaultProps.onToggleAdjacent).toHaveBeenCalledWith(true);
    });

    it('shows AI difficulty selector only in vsAI mode', () => {
        const { rerender } = render(<GameControls {...defaultProps} gameMode="vsAI" />);
        expect(screen.getByText('AI Difficulty:')).toBeInTheDocument();

        rerender(<GameControls {...defaultProps} gameMode="vsPlayer" />);
        expect(screen.queryByText('AI Difficulty:')).not.toBeInTheDocument();
    });

    it('calls onBackToMenu when change mode button is clicked', () => {
        render(<GameControls {...defaultProps} />);

        fireEvent.click(screen.getByText('Change'));
        expect(defaultProps.onBackToMenu).toHaveBeenCalled();
    });
});
