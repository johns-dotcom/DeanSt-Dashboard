export function ThemeScript() {
  const code = `
(function() {
  try {
    var t = localStorage.getItem('deanst.theme');
    if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
    var c = localStorage.getItem('deanst.compact');
    if (c === '1') document.documentElement.classList.add('compact');
  } catch (e) {}
})();
`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
