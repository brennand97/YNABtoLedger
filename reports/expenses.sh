#!/bin/sh

if [-z "$LEDGER_TERM" ]; then
  LEDGER_TERM="qt size 1280,720 persist"
fi

ledger -J bal "$@" --sort="-abs(amount)" --flat --no-total --plot-total-format="\"%(partial_account(options.flat))\" %(abs(quantity(scrub(total))))\n" > ledgeroutput1.tmp

(cat <<EOF) | gnuplot
  set terminal $LEDGER_TERM
  set style data histogram
  set style histogram clustered gap 1
  set style fill transparent solid 0.4 noborder
  set xtics nomirror scale 0 rotate by -45
  set ytics add ('' 0) scale 0
  set border 1
  set grid ytics
  set title "Histogram of $@"
  set ylabel "Amount"
  plot "ledgeroutput1.tmp" using 2:xticlabels(1) notitle linecolor rgb "turquoise", '' using 0:2:2 with labels font "Courier,8" offset 0,0.5 textcolor linestyle 0 notitle
  pause mouse any
EOF

rm ledgeroutput*.tmp
