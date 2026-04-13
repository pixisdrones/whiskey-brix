import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

function ToolbarBtn({ label, title, active, onClick }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={e => { e.preventDefault(); onClick() }}
      className={`rte-btn${active ? ' is-active' : ''}`}
    >
      {label}
    </button>
  )
}

export default function RichTextEditor({ value, onChange }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onChange(html === '<p></p>' ? '' : html)
    },
  })

  if (!editor) return null

  return (
    <div className="rte-wrapper">
      <div className="rte-toolbar">
        <ToolbarBtn label="H1" title="Heading 1"
          active={editor.isActive('heading', { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} />
        <ToolbarBtn label="H2" title="Heading 2"
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
        <ToolbarBtn label="H3" title="Heading 3"
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
        <span className="rte-sep" />
        <ToolbarBtn label="• List" title="Bullet list"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()} />
        <ToolbarBtn label="1. List" title="Numbered list"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()} />
        <span className="rte-sep" />
        <ToolbarBtn label="B" title="Bold"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()} />
        <ToolbarBtn label="I" title="Italic"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()} />
        <ToolbarBtn label="——" title="Horizontal rule"
          active={false}
          onClick={() => editor.chain().focus().setHorizontalRule().run()} />
      </div>
      <EditorContent editor={editor} className="rte-content" />
    </div>
  )
}
