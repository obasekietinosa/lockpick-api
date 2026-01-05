import React from "react";
import { Modal } from "../ui/Modal";

interface RulesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="How to Play">
            <div className="space-y-6 text-lg">
                <section>
                    <h3 className="text-2xl font-bold text-secondary mb-2">Objective</h3>
                    <p className="text-gray-600">
                        Guess the secret sequence of numbers (pin) set by your opponent. The first player to guess correctly wins the round!
                    </p>
                </section>

                <section>
                    <h3 className="text-2xl font-bold text-accent mb-2">Feedback</h3>
                    <p className="text-gray-600 mb-2">
                        After each guess, you'll get colored indicators:
                    </p>
                    <ul className="space-y-2 list-none">
                        <li className="flex items-center gap-3">
                            <span className="text-2xl">🟩</span>
                            <span><strong>Green:</strong> Correct number in the correct position.</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="text-2xl">🟧</span>
                            <span><strong>Orange:</strong> Correct number, but in the wrong position (with Hints enabled).</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="text-2xl">⬜️</span>
                            <span><strong>Grey:</strong> Incorrect number.</span>
                        </li>
                    </ul>
                </section>

                <section>
                    <h3 className="text-2xl font-bold text-primary mb-2">Game Modes</h3>
                    <p className="text-gray-600">
                        <strong>Single Player:</strong> Play against the computer.<br />
                        <strong>Multiplayer:</strong> Play against a friend or a random opponent.
                    </p>
                </section>

                <section>
                    <h3 className="text-2xl font-bold text-secondary mb-2">Rounds</h3>
                    <p className="text-gray-600">
                        The game consists of <strong>3 rounds</strong>. You win the game by winning the most rounds.
                    </p>
                </section>
            </div>
        </Modal>
    );
};
