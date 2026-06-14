// The editable canvas — direct manipulation of the live page. Click text to edit
// it in place; grab a block to drag it; hover the gaps to insert; select a block
// for its toolbar (move / duplicate / advanced edit / delete). This IS the page
// that ships — same <BlockView> as the public storefront.
import { useState } from "react";
import {
  DndContext, DragOverlay, PointerSensor, KeyboardSensor, useSensor, useSensors,
  closestCenter, type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { BLOCK_META, BLOCK_TYPES, newBlockId } from "~/lib/blocks.mjs";
import { BlockEditor } from "~/components/block-editor";
import { BlockView, themeFor, rootAccentStyle, type Block, type StoreSite, type StoreProduct } from "~/components/storefront";

function AddMenu({ onPick, onClose }: { onPick: (t: string) => void; onClose: () => void }) {
  return (
    <div className="mk-modal-backdrop" onClick={onClose}>
      <div className="mk-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Add a block">
        <div className="mk-modal-head"><b>Add a block</b><button className="mk-x" onClick={onClose} aria-label="Close">×</button></div>
        <div className="mk-modal-body">
          <div className="mk-addgrid">
            {(BLOCK_TYPES as string[]).map((t) => {
              const m = (BLOCK_META as Record<string, any>)[t];
              return <button key={t} className="mk-addbtn" type="button" onClick={() => onPick(t)}><span style={{ fontSize: "1.5rem" }}>{m.icon}</span><span>{m.label}</span></button>;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function InsertZone({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="mk-cv-insert">
      <button type="button" className="mk-cv-insert-btn" onClick={onAdd} aria-label="Add a block here">＋</button>
    </div>
  );
}

function CanvasBlock({
  block, index, total, selected, onSelect, onText, onMove, onDuplicate, onEdit, onDelete, site, products, accent, theme,
}: {
  block: Block; index: number; total: number; selected: boolean;
  onSelect: () => void; onText: (field: string, v: string) => void;
  onMove: (dir: -1 | 1) => void; onDuplicate: () => void; onEdit: () => void; onDelete: () => void;
  site: StoreSite; products: StoreProduct[]; accent: string; theme: any;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const meta = (BLOCK_META as Record<string, any>)[block.type] || { label: block.type, icon: "▫︎" };
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`mk-cv-block ${selected ? "is-selected" : ""} ${isDragging ? "is-dragging" : ""}`}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
    >
      <div className="mk-cv-tag">{meta.icon} {meta.label}</div>
      <button className="mk-cv-grip" {...attributes} {...listeners} aria-label={`Move ${meta.label} block`} onClick={(e) => e.stopPropagation()}>⠿</button>
      {selected && (
        <div className="mk-cv-toolbar" onClick={(e) => e.stopPropagation()}>
          <button disabled={index === 0} onClick={() => onMove(-1)} title="Move up" aria-label="Move up">↑</button>
          <button disabled={index === total - 1} onClick={() => onMove(1)} title="Move down" aria-label="Move down">↓</button>
          <button onClick={onEdit} title="Edit details" aria-label="Edit details">✎</button>
          <button onClick={onDuplicate} title="Duplicate" aria-label="Duplicate">⧉</button>
          <button className="danger" onClick={onDelete} title="Delete" aria-label="Delete">🗑</button>
        </div>
      )}
      <BlockView block={block} site={site} products={products} accent={accent} theme={theme} preview edit={{ onText }} index={index} />
    </div>
  );
}

export function EditableCanvas({
  site, sections, products, onChange,
}: {
  site: StoreSite;
  sections: Block[];
  products: StoreProduct[];
  onChange: (next: Block[], opts?: { immediate?: boolean }) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [addAt, setAddAt] = useState<number | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const { theme, accent } = themeFor(site);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const setText = (id: string, field: string, v: string) =>
    onChange(sections.map((s) => (s.id === id ? { ...s, data: { ...s.data, [field]: v } } : s)), { immediate: false });
  const move = (id: string, dir: -1 | 1) => {
    const i = sections.findIndex((s) => s.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= sections.length) return;
    onChange(arrayMove(sections, i, j));
  };
  const duplicate = (id: string) => {
    const i = sections.findIndex((s) => s.id === id);
    if (i < 0) return;
    const copy = { ...sections[i], id: newBlockId(), data: JSON.parse(JSON.stringify(sections[i].data || {})) };
    onChange([...sections.slice(0, i + 1), copy, ...sections.slice(i + 1)]);
    setSelected(copy.id);
  };
  const remove = (id: string) => { onChange(sections.filter((s) => s.id !== id)); if (selected === id) setSelected(null); };
  const addBlock = (type: string) => {
    const at = addAt ?? sections.length;
    const b: Block = { id: newBlockId(), type, data: (BLOCK_META as Record<string, any>)[type].def() };
    onChange([...sections.slice(0, at), b, ...sections.slice(at)]);
    setAddAt(null);
    setSelected(b.id);
    if (type !== "hero" && type !== "text" && type !== "products") setEditing(b.id);
  };
  function onDragStart(e: DragStartEvent) { setDragId(String(e.active.id)); setSelected(String(e.active.id)); }
  function onDragEnd(e: DragEndEvent) {
    setDragId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldI = sections.findIndex((s) => s.id === active.id);
    const newI = sections.findIndex((s) => s.id === over.id);
    if (oldI < 0 || newI < 0) return;
    onChange(arrayMove(sections, oldI, newI));
  }

  const editingBlock = sections.find((s) => s.id === editing) || null;
  const dragBlock = sections.find((s) => s.id === dragId) || null;

  return (
    <div className="mk-cv" onClick={() => setSelected(null)}>
      <div className="mk-store mk-cv-store" style={rootAccentStyle(accent)}>
        {sections.length === 0 ? (
          <div className="mk-cv-empty">
            <h2>Your page is empty</h2>
            <p>Add your first block to start building.</p>
            <button className="bv-btn primary" onClick={(e) => { e.stopPropagation(); setAddAt(0); }}>＋ Add a block</button>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <InsertZone onAdd={() => setAddAt(0)} />
              {sections.map((b, i) => (
                <div key={b.id}>
                  <CanvasBlock
                    block={b} index={i} total={sections.length}
                    selected={selected === b.id}
                    onSelect={() => setSelected(b.id)}
                    onText={(field, v) => setText(b.id, field, v)}
                    onMove={(dir) => move(b.id, dir)}
                    onDuplicate={() => duplicate(b.id)}
                    onEdit={() => setEditing(b.id)}
                    onDelete={() => remove(b.id)}
                    site={site} products={products} accent={accent} theme={theme}
                  />
                  <InsertZone onAdd={() => setAddAt(i + 1)} />
                </div>
              ))}
            </SortableContext>
            <DragOverlay>
              {dragBlock ? (
                <div className="mk-store mk-cv-ghost" style={rootAccentStyle(accent)}>
                  <BlockView block={dragBlock} site={site} products={products} accent={accent} theme={theme} preview index={0} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
        <footer className="mk-store-foot"><span>{site.business_name}</span><span className="mk-store-foot-by">Powered by Inkress</span></footer>
      </div>

      {addAt !== null && <AddMenu onPick={addBlock} onClose={() => setAddAt(null)} />}
      {editingBlock && <BlockEditor block={editingBlock} onChange={(data) => onChange(sections.map((s) => (s.id === editingBlock.id ? { ...s, data } : s)), { immediate: false })} onClose={() => setEditing(null)} />}
    </div>
  );
}
