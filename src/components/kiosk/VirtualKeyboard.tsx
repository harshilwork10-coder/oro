'use client'

import { useState } from 'react'
import Keyboard from 'react-simple-keyboard'
import 'react-simple-keyboard/build/css/index.css'

interface VirtualKeyboardProps {
    onChange: (value: string) => void
    value: string
    mode?: 'full' | 'numeric'
    placeholder?: string
    onEnter?: () => void  // Callback when Enter is pressed
}

export default function VirtualKeyboard({
    onChange,
    value,
    mode = 'numeric',
    placeholder = '',
    onEnter
}: VirtualKeyboardProps) {
    const [layoutName, setLayoutName] = useState('default')

    const numericLayout = {
        default: [
            '1 2 3',
            '4 5 6',
            '7 8 9',
            '{bksp} 0 {enter}'
        ]
    }

    const fullLayout = {
        default: [
            'q w e r t y u i o p',
            'a s d f g h j k l',
            '{shift} z x c v b n m {bksp}',
            '{space} {enter}'
        ],
        shift: [
            'Q W E R T Y U I O P',
            'A S D F G H J K L',
            '{shift} Z X C V B N M {bksp}',
            '{space} {enter}'
        ]
    }

    const handleShift = () => {
        setLayoutName(layoutName === 'default' ? 'shift' : 'default')
    }

    const onKeyPress = (button: string) => {
        if (button === '{shift}') handleShift()
        if (button === '{enter}' && onEnter) {
            // Call the onEnter callback if provided
            onEnter()
        }
    }

    return (
        <div className="virtual-keyboard-container rounded-xl shadow-2xl p-4 border border-stone-800">
            <Keyboard
                onChange={onChange}
                onKeyPress={onKeyPress}
                layout={mode === 'numeric' ? numericLayout : fullLayout}
                layoutName={layoutName}
                display={{
                    '{bksp}': '⌫',
                    '{enter}': 'Enter',
                    '{shift}': '⇧',
                    '{space}': 'Space'
                }}
                theme="hg-theme-default hg-layout-default kiosk-keyboard"
                buttonTheme={[
                    {
                        class: 'hg-button-large',
                        buttons: '{bksp} {enter} {shift} {space}'
                    }
                ]}
            />
            <style jsx global>{`
                .kiosk-keyboard .hg-button {
                    height: 70px;
                    font-size: 24px;
                    font-weight: 600;
                    border-radius: 12px;
                    background: #292524; /* stone-800 */
                    color: #f5f5f4; /* stone-100 */
                    border: 1px solid #44403c; /* stone-700 */
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
                    transition: all 0.15s ease;
                }

                .kiosk-keyboard .hg-button:active {
                    background: #44403c; /* stone-700 */
                    transform: scale(0.95);
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                }

                .kiosk-keyboard .hg-button-large {
                    background: linear-gradient(to bottom, #ea580c, #c2410c); /* orange-600 to orange-700 */
                    color: white;
                    border-color: #9a3412; /* orange-800 */
                }

                .kiosk-keyboard .hg-button-large:active {
                    background: linear-gradient(to bottom, #c2410c, #9a3412);
                }

                .kiosk-keyboard {
                    background: transparent;
                }

                .virtual-keyboard-container {
                    max-width: 100%;
                    touch-action: manipulation;
                    background: rgba(28, 25, 23, 0.5); /* stone-900/50 */
                    backdrop-filter: blur(12px);
                    border-color: rgba(249, 115, 22, 0.1); /* orange-500/10 */
                }
            `}</style>
        </div>
    )
}
