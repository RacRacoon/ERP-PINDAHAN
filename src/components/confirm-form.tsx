"use client";

/** Form dengan konfirmasi browser sebelum aksi destruktif dijalankan. */
export function ConfirmForm({
  action,
  message,
  children,
}: {
  action: () => void | Promise<void>;
  message: string;
  children: React.ReactNode;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </form>
  );
}
