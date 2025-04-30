import React from 'react'
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Text,
  CheckSquare,
} from 'lucide-react'
import { createSuggestionItems } from 'novel'
import { Command, renderItems } from 'novel'

export const suggestionItems = createSuggestionItems([
  {
    title: 'Text',
    description: 'Just start typing with plain text.',
    searchTerms: ['p', 'paragraph'],
    icon: React.createElement(Text, { size: 18 }),
    command: ({ editor, range } ) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .toggleNode('paragraph', 'paragraph')
        .run()
    }
  },
  
  {
    title: 'Heading 1',
    description: 'Big section heading.',
    searchTerms: ['title', 'big', 'large'],
    icon: React.createElement(Heading1, { size: 18 }),
    command: ({ editor, range } ) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode('heading', { level: 1 })
        .run()
    }
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading.',
    searchTerms: ['subtitle', 'medium'],
    icon: React.createElement(Heading2, { size: 18 }),
    command: ({ editor, range } ) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode('heading', { level: 2 })
        .run()
    }
  },
  {
    title: 'Heading 3',
    description: 'Small section heading.',
    searchTerms: ['subtitle', 'small'],
    icon: React.createElement(Heading3, { size: 18 }),
    command: ({ editor, range } ) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode('heading', { level: 3 })
        .run()
    }
  },
  {
    title: 'Bullet List',
    description: 'Create a simple bullet list.',
    searchTerms: ['unordered', 'point'],
    icon: React.createElement(List, { size: 18 }),
    command: ({ editor, range } ) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run()
    }
  },
  {
    title: 'Numbered List',
    description: 'Create a list with numbering.',
    searchTerms: ['ordered'],
    icon: React.createElement(ListOrdered, { size: 18 }),
    command: ({ editor, range } ) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run()
    }
  },
  {
    title: 'Todo List',
    description: 'Create a todo list with checkboxes.',
    searchTerms: ['todo', 'task', 'checkbox', 'check', 'done'],
    icon: React.createElement(CheckSquare, { size: 18 }),
    command: ({ editor, range } ) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run()
    }
  }
])

export const slashCommand = Command.configure({
  suggestion: {
    items: () => suggestionItems,
    render: renderItems,
  },
});