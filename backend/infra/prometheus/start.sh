#!/bin/bash

./prometheus/prometheus \
	--web.enable-remote-write-receiver \
	--web.enable-otlp-receiver \
	--enable-feature=exemplar-storage \
	--enable-feature=native-histograms \
	--storage.tsdb.path=/data/prometheus \
	--web.listen-address=0.0.0.0:4444 \
	--config.file=./prometheus.yml