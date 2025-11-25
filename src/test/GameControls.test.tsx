import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GameControls from '../components/GameControls';
import '@testing-library/jest-dom';

describe('GameControls Component', () => {
    const defaultProps = {
        status: 'placement' as const,
        onStart: vi.fn(),
        onReset: vi.fn(),
        onRandomize: vi.fn(),
        onBackToMenu: vi.fn(),
        aiDifficulty: 'random' as const,
        onAIDifficultyChange: vi.fn(),
        gameMode: 'vsAI' as const,
        allowAdjacent: false,
        onToggleAdjacent: vi.fn(),
        placementMode: 'random' as const,
        onPlacementModeChange: vi.fn(),
        canStartGame: true,
    };

    it('should render "Start Game" button in placement mode', () => {
        render(<GameControls {...defaultProps} />);
        expect(screen.getByText('Start Game')).toBeInTheDocument();
        expect(screen.getByText('Randomize Ships')).toBeInTheDocument();
    });

    it('should render "New Game" button in playing/finished mode vsAI', () => {
        render(<GameControls {...defaultProps} status="playing" />);
        expect(screen.getByText('New Game')).toBeInTheDocument();
    });

    it('should render "Leave Game" button in playing/finished mode vsPlayer', () => {
        render(<GameControls {...defaultProps} status="playing" gameMode="vsPlayer" />);
        expect(screen.getByText('Leave Game')).toBeInTheDocument();
    });

    it('should render "Leave Room" button in placement mode vsPlayer', () => {
        render(<GameControls {...defaultProps} status="placement" gameMode="vsPlayer" />);
        expect(screen.getByText('Leave Room')).toBeInTheDocument();
    });

    it('should call onStart when "Start Game" is clicked', () => {
        render(<GameControls {...defaultProps} />);
        fireEvent.click(screen.getByText('Start Game'));
        expect(defaultProps.onStart).toHaveBeenCalled();
    });

    it('should call onReset when "New Game" is clicked in vsAI', () => {
        render(<GameControls {...defaultProps} status="playing" />);
        fireEvent.click(screen.getByText('New Game'));
        expect(defaultProps.onReset).toHaveBeenCalled();
    });

    it('should call onBackToMenu when "Leave Game" is clicked in vsPlayer', () => {
        render(<GameControls {...defaultProps} status="playing" gameMode="vsPlayer" />);
        fireEvent.click(screen.getByText('Leave Game'));
        expect(defaultProps.onBackToMenu).toHaveBeenCalled();
    });

    it('should show AI difficulty selector in vsAI mode', () => {
        render(<GameControls {...defaultProps} />);
        expect(screen.getByText('AI Difficulty:')).toBeInTheDocument();
    });

    it('should NOT show AI difficulty selector in vsPlayer mode', () => {
        render(<GameControls {...defaultProps} gameMode="vsPlayer" />);
        expect(screen.queryByText('AI Difficulty')).not.toBeInTheDocument();
    });
});
