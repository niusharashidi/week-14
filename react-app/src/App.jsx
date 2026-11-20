import { useEffect, useMemo, useState } from "react";
import "./App.css";

const SEED = [
  { id: 1, name: "سینا", email: "sina.gh@gmail.com", job: "", phone: "" },
  { id: 2, name: "محمد", email: "mohammad.1388@gmail.com", job: "", phone: "" },
  { id: 3, name: "سهراب", email: "solhrab.rezabakhsh@gmail.com", job: "", phone: "" },
  { id: 4, name: "پژمان جمشیدی", email: "alcatraz98@gmail.com", job: "", phone: "" },
];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^09\d{9}$/;
const EMPTY = { name: "", email: "", job: "", phone: "" };

function load() {
  try {
    return JSON.parse(localStorage.getItem("contacts")) || SEED;
  } catch {
    return SEED;
  }
}

function validate(v, contacts, editingId) {
  const e = {};
  if (v.name.trim().length < 3) e.name = "نام باید حداقل ۳ حرف باشد.";
  if (!EMAIL_RE.test(v.email)) e.email = "ایمیل معتبر نیست.";
  else if (contacts.some((c) => c.email.toLowerCase() === v.email.toLowerCase() && c.id !== editingId))
    e.email = "این ایمیل قبلاً ثبت شده است.";
  if (v.phone && !PHONE_RE.test(v.phone)) e.phone = "شماره باید مانند 09120123435 باشد.";
  return e;
}

function Modal({ text, confirmLabel, danger, onConfirm, onCancel }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);
  return (
    <div className="backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <p>{text}</p>
        <p>آیا مطمئن هستید؟</p>
        <div className="modal-actions">
          <button className={danger ? "btn danger" : "btn success"} onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button className="btn gray" onClick={onCancel}>انصراف</button>
        </div>
      </div>
    </div>
  );
}

function ContactForm({ initial, contacts, editingId, onSubmit, onBack }) {
  const [values, setValues] = useState(initial || EMPTY);
  const [touched, setTouched] = useState({});
  const errors = validate(values, contacts, editingId);
  const changed = JSON.stringify(values) !== JSON.stringify(initial || EMPTY);
  const valid = Object.keys(errors).length === 0 && changed;
  const fields = [
    ["name", "نام و نام خانوادگی:", "text"],
    ["email", "ایمیل:", "email"],
    ["job", "شغل:", "text"],
    ["phone", "تلفن همراه:", "tel"],
  ];
  return (
    <div className="page">
      <button className="icon-btn" onClick={onBack} title="لیست مخاطبین">📒</button>
      <form className="form" onSubmit={(e) => { e.preventDefault(); if (valid) onSubmit(values); }}>
        {fields.map(([key, label, type]) => (
          <div className="row" key={key}>
            <label htmlFor={key}>{label}</label>
            <div className="field">
              <input
                id={key}
                type={type}
                value={values[key]}
                className={touched[key] && errors[key] ? "invalid" : ""}
                onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                onBlur={() => setTouched({ ...touched, [key]: true })}
              />
              {touched[key] && errors[key] && <small className="error">{errors[key]}</small>}
            </div>
          </div>
        ))}
        <button className="btn success big" disabled={!valid}>
          {editingId ? "اعمال تغییرات" : "افزودن"}
        </button>
      </form>
    </div>
  );
}

export default function App() {
  const [contacts, setContacts] = useState(load);
  const [view, setView] = useState({ name: "list" });
  const [query, setQuery] = useState("");
  const [openRow, setOpenRow] = useState(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState([]);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => localStorage.setItem("contacts", JSON.stringify(contacts)), [contacts]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contacts.filter((c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q));
  }, [contacts, query]);

  const notify = (text) => setToast(text);
  const exitSelect = () => { setSelectMode(false); setSelected([]); };
  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const save = (values) => {
    const editing = view.name === "edit";
    setModal({
      text: editing ? "شما درحال تغییر اطلاعات این مخاطب هستید." : "شما در حال افزودن مخاطب جدید هستید.",
      confirmLabel: editing ? "اعمال تغییرات" : "افزودن",
      onConfirm: () => {
        if (editing) setContacts((cs) => cs.map((c) => (c.id === view.contact.id ? { ...c, ...values } : c)));
        else setContacts((cs) => [...cs, { ...values, id: Date.now() }]);
        setModal(null);
        setView({ name: "list" });
        notify(editing ? "تغییرات با موفقیت اعمال شد." : "مخاطب با موفقیت افزوده شد.");
      },
    });
  };

  const removeOne = (id) =>
    setModal({
      text: "شما در حال حذف یکی از مخاطبینتان هستید!",
      confirmLabel: "حذف",
      danger: true,
      onConfirm: () => {
        setContacts((cs) => cs.filter((c) => c.id !== id));
        setModal(null);
        setOpenRow(null);
        notify("مخاطب حذف شد.");
      },
    });

  const removeSelected = () =>
    setModal({
      text: `شما در حال حذف ${selected.length} مخاطب هستید!`,
      confirmLabel: "حذف",
      danger: true,
      onConfirm: () => {
        setContacts((cs) => cs.filter((c) => !selected.includes(c.id)));
        setModal(null);
        exitSelect();
        notify("مخاطبین انتخاب‌شده حذف شدند.");
      },
    });

  return (
    <div dir="rtl" className="app">
      {view.name !== "list" ? (
        <ContactForm
          key={view.contact?.id || "new"}
          initial={view.contact && { name: view.contact.name, email: view.contact.email, job: view.contact.job, phone: view.contact.phone }}
          contacts={contacts}
          editingId={view.contact?.id}
          onSubmit={save}
          onBack={() => setView({ name: "list" })}
        />
      ) : (
        <div className="page">
          <div className="toolbar">
            <label htmlFor="search">جستجو در مخاطبین:</label>
            <input id="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="نام یا ایمیل..." />
            <button className="icon-btn" title={selectMode ? "لغو انتخاب" : "انتخاب گروهی"} onClick={() => (selectMode ? exitSelect() : setSelectMode(true))}>
              {selectMode ? "↩" : "☑"}
            </button>
            {selectMode ? (
              <button className="btn danger" disabled={!selected.length} onClick={removeSelected}>
                حذف ({selected.length})
              </button>
            ) : (
              <button className="icon-btn" title="افزودن مخاطب" onClick={() => setView({ name: "add" })}>＋</button>
            )}
          </div>
          <ul className="list">
            {filtered.length === 0 && <li className="empty">مخاطبی یافت نشد.</li>}
            {filtered.map((c) => (
              <li key={c.id} className={selected.includes(c.id) ? "item selected" : "item"}>
                <span className="name">{c.name}</span>
                <span className="email">{c.email}</span>
                <span className="actions">
                  {selectMode ? (
                    <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggle(c.id)} />
                  ) : openRow === c.id ? (
                    <>
                      <button className="btn warn" onClick={() => setView({ name: "edit", contact: c })}>ویرایش</button>
                      <button className="btn danger" onClick={() => removeOne(c.id)}>حذف</button>
                    </>
                  ) : (
                    <button className="dots" onClick={() => setOpenRow(c.id)}>•••</button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {modal && <Modal {...modal} onCancel={() => setModal(null)} />}
      {toast && (
        <div className="toast" role="status">
          ℹ {toast}
          <button onClick={() => setToast(null)}>✕</button>
        </div>
      )}
    </div>
  );
}